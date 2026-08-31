import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { sql } from "kysely";
import { db } from "../../../db/kysely.js";
import { OutboxEventPublisher } from "../../../events/outbox-publisher.js";
import { KyselyProductRepository } from "../../catalog/infrastructure/product-repository.kysely.js";
import { KyselyResourceRepository } from "../../capacity/infrastructure/resource-repository.kysely.js";
import { KyselyCapacityCommitmentRepository } from "../../capacity/infrastructure/capacity-commitment-repository.kysely.js";
import { KyselyReservationRepository } from "../../capacity/infrastructure/reservation-repository.kysely.js";
import { CreateOrderUseCase } from "../../commerce/application/create-order.usecase.js";
import { TransitionOrderStatusUseCase } from "../../commerce/application/transition-order-status.usecase.js";
import { KyselyOrderRepository } from "../../commerce/infrastructure/order-repository.kysely.js";
import { ensureCheckoutSystemUserId } from "../../commerce/infrastructure/system-user.kysely.js";
import { CreatePaymentUseCase } from "../application/create-payment.usecase.js";
import { ProcessStripeWebhookUseCase } from "../application/process-stripe-webhook.usecase.js";
import { RefundPaymentUseCase } from "../application/refund-payment.usecase.js";
import type {
  CreateIntentInput,
  CreateIntentResult,
  PaymentProviderPort,
  ProviderWebhookEvent,
  RefundInput,
  RefundResult,
} from "../domain/ports.js";
import { KyselyPaymentEventRepository } from "./payment-event-repository.kysely.js";
import { KyselyPaymentRepository } from "./payment-repository.kysely.js";

/**
 * spec: payments/payment (full lifecycle, webhook idempotency, refund,
 * tenant isolation). Requires a reachable Postgres, same skip-if-unreachable
 * convention as order-checkout.integration.test.ts. Uses a fake
 * PaymentProviderPort instead of the real Stripe API (no test-mode
 * credentials available in this environment - see design.md - Open
 * Questions and tasks.md 7.2).
 */
let dbReachable = true;

beforeAll(async () => {
  try {
    await sql`select 1`.execute(db);
  } catch {
    dbReachable = false;
  }
});

afterAll(async () => {
  if (dbReachable) {
    await db.destroy();
  }
});

class FakePaymentProvider implements PaymentProviderPort {
  public refundCalls: RefundInput[] = [];
  async createIntent(input: CreateIntentInput): Promise<CreateIntentResult> {
    return { providerPaymentId: `pi_fake_${input.paymentId}`, clientSecret: `pi_fake_${input.paymentId}_secret` };
  }
  async refund(input: RefundInput): Promise<RefundResult> {
    this.refundCalls.push(input);
    return { providerRefundId: randomUUID() };
  }
  verifyWebhookSignature(): ProviderWebhookEvent {
    throw new Error("not used in this test - webhook events are constructed directly");
  }
}

async function seedTenant(name: string) {
  const tenantId = randomUUID();
  const venueId = randomUUID();

  await db.insertInto("organizations").values({ id: tenantId, name }).execute();
  await sql`select set_config('app.tenant_id', ${tenantId}, false)`.execute(db);
  await db.insertInto("venues").values({ id: venueId, tenant_id: tenantId, name: "Unidade" }).execute();

  const variantId = await db.transaction().execute(async (trx) => {
    await sql`select set_config('app.tenant_id', ${tenantId}, true)`.execute(trx);
    const product = await new KyselyProductRepository(trx).create({
      id: randomUUID(),
      tenantId,
      venueId,
      name: "Ingresso",
      variants: [{ id: randomUUID(), name: "Único", priceCents: 5000 }],
    });
    return product.variants[0]!.id;
  });

  return { tenantId, venueId, variantId };
}

async function createAwaitingPaymentOrder(tenantId: string, venueId: string, variantId: string) {
  return db.transaction().execute(async (trx) => {
    await sql`select set_config('app.tenant_id', ${tenantId}, true)`.execute(trx);
    const actorUserId = await ensureCheckoutSystemUserId(trx, tenantId);
    const order = await new CreateOrderUseCase(
      new KyselyProductRepository(trx),
      new KyselyResourceRepository(trx),
      new KyselyCapacityCommitmentRepository(trx),
      new KyselyReservationRepository(trx),
      new KyselyOrderRepository(trx),
      new OutboxEventPublisher(trx),
    ).execute({
      tenantId,
      venueId,
      lines: [{ variantId, quantity: 1 }],
      holdExpiresAt: new Date(Date.now() + 900_000),
      actorUserId,
    });
    await new TransitionOrderStatusUseCase(new KyselyOrderRepository(trx), new OutboxEventPublisher(trx)).execute({
      tenantId,
      orderId: order.id,
      to: "awaiting_payment",
      actorUserId,
    });
    return order;
  });
}

async function createPayment(tenantId: string, orderId: string, provider: FakePaymentProvider) {
  return db.transaction().execute(async (trx) => {
    await sql`select set_config('app.tenant_id', ${tenantId}, true)`.execute(trx);
    const actorUserId = await ensureCheckoutSystemUserId(trx, tenantId);
    return new CreatePaymentUseCase(new KyselyOrderRepository(trx), new KyselyPaymentRepository(trx), provider).execute({
      tenantId,
      orderId,
      method: "card",
      actorUserId,
    });
  });
}

async function deliverWebhook(tenantId: string, event: ProviderWebhookEvent) {
  await db.transaction().execute(async (trx) => {
    await sql`select set_config('app.tenant_id', ${tenantId}, true)`.execute(trx);
    const actorUserId = await ensureCheckoutSystemUserId(trx, tenantId);
    await new ProcessStripeWebhookUseCase(
      new KyselyPaymentEventRepository(trx),
      new KyselyPaymentRepository(trx),
      new KyselyOrderRepository(trx),
      new OutboxEventPublisher(trx),
    ).execute({ tenantId, event, actorUserId });
  });
}

async function refund(tenantId: string, paymentId: string, amountCents: number, provider: FakePaymentProvider) {
  return db.transaction().execute(async (trx) => {
    await sql`select set_config('app.tenant_id', ${tenantId}, true)`.execute(trx);
    const actorUserId = await ensureCheckoutSystemUserId(trx, tenantId);
    return new RefundPaymentUseCase(
      new KyselyPaymentRepository(trx),
      provider,
      new KyselyOrderRepository(trx),
      new OutboxEventPublisher(trx),
    ).execute({ tenantId, paymentId, amountCents, actorUserId });
  });
}

describe.skipIf(!dbReachable)("Payment lifecycle (live Postgres)", () => {
  it("drives an order from awaiting_payment to paid via a simulated webhook, exactly once", async () => {
    const { tenantId, venueId, variantId } = await seedTenant("Zoo Payment");
    const order = await createAwaitingPaymentOrder(tenantId, venueId, variantId);
    const provider = new FakePaymentProvider();

    const { payment } = await createPayment(tenantId, order.id, provider);
    expect(payment.status).toBe("pending");

    const event: ProviderWebhookEvent = {
      id: `evt_${randomUUID()}`,
      type: "payment_intent.succeeded",
      paymentIntentId: payment.providerPaymentId,
      metadata: { tenantId, orderId: order.id, paymentId: payment.id },
    };

    // Deliver the same event twice (simulated retry) - must apply its effect only once.
    await deliverWebhook(tenantId, event);
    await deliverWebhook(tenantId, event);

    await sql`select set_config('app.tenant_id', ${tenantId}, false)`.execute(db);
    const orderRow = await db.selectFrom("orders").selectAll().where("id", "=", order.id).executeTakeFirstOrThrow();
    expect(orderRow.status).toBe("paid");

    const paymentRow = await db
      .selectFrom("payments")
      .selectAll()
      .where("id", "=", payment.id)
      .executeTakeFirstOrThrow();
    expect(paymentRow.status).toBe("succeeded");

    const historyRows = await db
      .selectFrom("payment_status_history")
      .selectAll()
      .where("payment_id", "=", payment.id)
      .where("to_status", "=", "succeeded")
      .execute();
    expect(historyRows).toHaveLength(1);

    const eventRows = await db
      .selectFrom("payment_events")
      .selectAll()
      .where("provider_event_id", "=", event.id)
      .execute();
    expect(eventRows).toHaveLength(1);
  });

  it("leaves the order awaiting_payment when the payment fails", async () => {
    const { tenantId, venueId, variantId } = await seedTenant("Zoo Payment Failed");
    const order = await createAwaitingPaymentOrder(tenantId, venueId, variantId);
    const provider = new FakePaymentProvider();
    const { payment } = await createPayment(tenantId, order.id, provider);

    await deliverWebhook(tenantId, {
      id: `evt_${randomUUID()}`,
      type: "payment_intent.payment_failed",
      paymentIntentId: payment.providerPaymentId,
      metadata: { tenantId, orderId: order.id, paymentId: payment.id },
    });

    await sql`select set_config('app.tenant_id', ${tenantId}, false)`.execute(db);
    const orderRow = await db.selectFrom("orders").selectAll().where("id", "=", order.id).executeTakeFirstOrThrow();
    expect(orderRow.status).toBe("awaiting_payment");
    const paymentRow = await db
      .selectFrom("payments")
      .selectAll()
      .where("id", "=", payment.id)
      .executeTakeFirstOrThrow();
    expect(paymentRow.status).toBe("failed");
  });

  it("fully refunds a paid order and records both payment and order history", async () => {
    const { tenantId, venueId, variantId } = await seedTenant("Zoo Refund");
    const order = await createAwaitingPaymentOrder(tenantId, venueId, variantId);
    const provider = new FakePaymentProvider();
    const { payment } = await createPayment(tenantId, order.id, provider);
    await deliverWebhook(tenantId, {
      id: `evt_${randomUUID()}`,
      type: "payment_intent.succeeded",
      paymentIntentId: payment.providerPaymentId,
      metadata: { tenantId, orderId: order.id, paymentId: payment.id },
    });

    const refunded = await refund(tenantId, payment.id, payment.amountCents, provider);
    expect(refunded.status).toBe("refunded");
    expect(provider.refundCalls[0]?.amountCents).toBe(payment.amountCents);

    await sql`select set_config('app.tenant_id', ${tenantId}, false)`.execute(db);
    const orderRow = await db.selectFrom("orders").selectAll().where("id", "=", order.id).executeTakeFirstOrThrow();
    expect(orderRow.status).toBe("refunded");

    const orderHistory = await db
      .selectFrom("order_status_history")
      .selectAll()
      .where("order_id", "=", order.id)
      .where("to_status", "=", "refunded")
      .execute();
    expect(orderHistory).toHaveLength(1);

    const paymentHistory = await db
      .selectFrom("payment_status_history")
      .selectAll()
      .where("payment_id", "=", payment.id)
      .where("to_status", "=", "refunded")
      .execute();
    expect(paymentHistory).toHaveLength(1);
  });

  it("partially refunds a paid order and moves it to partially_refunded", async () => {
    const { tenantId, venueId, variantId } = await seedTenant("Zoo Partial Refund");
    const order = await createAwaitingPaymentOrder(tenantId, venueId, variantId);
    const provider = new FakePaymentProvider();
    const { payment } = await createPayment(tenantId, order.id, provider);
    await deliverWebhook(tenantId, {
      id: `evt_${randomUUID()}`,
      type: "payment_intent.succeeded",
      paymentIntentId: payment.providerPaymentId,
      metadata: { tenantId, orderId: order.id, paymentId: payment.id },
    });

    const partial = await refund(tenantId, payment.id, 2000, provider);
    expect(partial.status).toBe("partially_refunded");
    expect(partial.refundedAmountCents).toBe(2000);

    await sql`select set_config('app.tenant_id', ${tenantId}, false)`.execute(db);
    const orderRow = await db.selectFrom("orders").selectAll().where("id", "=", order.id).executeTakeFirstOrThrow();
    expect(orderRow.status).toBe("partially_refunded");
  });

  it("does not let a request scoped to one tenant read another tenant's payment", async () => {
    const tenantA = await seedTenant("Zoo Payment A");
    const tenantB = await seedTenant("Zoo Payment B");
    const orderA = await createAwaitingPaymentOrder(tenantA.tenantId, tenantA.venueId, tenantA.variantId);
    const provider = new FakePaymentProvider();
    const { payment } = await createPayment(tenantA.tenantId, orderA.id, provider);

    await db.transaction().execute(async (trx) => {
      await sql`select set_config('app.tenant_id', ${tenantB.tenantId}, true)`.execute(trx);
      const found = await new KyselyPaymentRepository(trx).findById(tenantB.tenantId, payment.id);
      expect(found).toBeNull();
    });
  });
});
