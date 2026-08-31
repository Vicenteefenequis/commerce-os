import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { sql } from "kysely";
import request from "supertest";
import { createApp } from "../../../http/app.js";
import { db } from "../../../db/kysely.js";
import { sessionCookieHeader } from "../../identity/infrastructure/cookie.js";
import { OutboxEventPublisher } from "../../../events/outbox-publisher.js";
import { KyselyProductRepository } from "../../catalog/infrastructure/product-repository.kysely.js";
import { KyselyResourceRepository } from "../../capacity/infrastructure/resource-repository.kysely.js";
import { KyselyCapacityCommitmentRepository } from "../../capacity/infrastructure/capacity-commitment-repository.kysely.js";
import { KyselyReservationRepository } from "../../capacity/infrastructure/reservation-repository.kysely.js";
import { CreateOrderUseCase } from "../application/create-order.usecase.js";
import { TransitionOrderStatusUseCase } from "../application/transition-order-status.usecase.js";
import { KyselyCustomerRepository } from "../../customer/infrastructure/customer-repository.kysely.js";
import { KyselyOrderRepository } from "./order-repository.kysely.js";
import { ensureCheckoutSystemUserId } from "./system-user.kysely.js";
import { CreatePaymentUseCase } from "../../payments/application/create-payment.usecase.js";
import { KyselyPaymentRepository } from "../../payments/infrastructure/payment-repository.kysely.js";
import type {
  CreateIntentInput,
  CreateIntentResult,
  PaymentProviderPort,
  ProviderWebhookEvent,
  RefundInput,
  RefundResult,
} from "../../payments/domain/ports.js";

class FakePaymentProvider implements PaymentProviderPort {
  async createIntent(input: CreateIntentInput): Promise<CreateIntentResult> {
    return { providerPaymentId: `pi_fake_${input.paymentId}`, clientSecret: `pi_fake_${input.paymentId}_secret` };
  }
  async refund(_input: RefundInput): Promise<RefundResult> {
    throw new Error("not used in this test");
  }
  verifyWebhookSignature(): ProviderWebhookEvent {
    throw new Error("not used in this test");
  }
}

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

async function seedTenantWithDraftOrder() {
  const tenantId = randomUUID();
  const venueId = randomUUID();

  await db.insertInto("organizations").values({ id: tenantId, name: "Zoo Order Detail" }).execute();
  await sql`select set_config('app.tenant_id', ${tenantId}, false)`.execute(db);
  await db.insertInto("venues").values({ id: venueId, tenant_id: tenantId, name: "Unidade" }).execute();

  const variantId = await db.transaction().execute(async (trx) => {
    await sql`select set_config('app.tenant_id', ${tenantId}, true)`.execute(trx);
    const product = await new KyselyProductRepository(trx).create({
      id: randomUUID(),
      tenantId,
      venueId,
      name: "Ingresso",
      variants: [{ id: randomUUID(), name: "Único", priceCents: 2500 }],
    });
    return product.variants[0]!.id;
  });

  const order = await db.transaction().execute(async (trx) => {
    await sql`select set_config('app.tenant_id', ${tenantId}, true)`.execute(trx);
    const actorUserId = await ensureCheckoutSystemUserId(trx, tenantId);
    return new CreateOrderUseCase(
      new KyselyProductRepository(trx),
      new KyselyResourceRepository(trx),
      new KyselyCapacityCommitmentRepository(trx),
      new KyselyReservationRepository(trx),
      new KyselyOrderRepository(trx),
      new KyselyCustomerRepository(trx),
      new OutboxEventPublisher(trx),
    ).execute({
      tenantId,
      venueId,
      customer: { email: "ana@example.com", name: "Ana" },
      lines: [{ variantId, quantity: 1 }],
      holdExpiresAt: new Date(Date.now() + 900_000),
      actorUserId,
    });
  });

  return { tenantId, order };
}

async function seedAuthenticatedStaff(tenantId: string) {
  const userId = randomUUID();
  await db
    .insertInto("users")
    .values({ id: userId, tenant_id: tenantId, email: `staff-${userId}@example.com`, password_hash: "x" })
    .execute();
  await db
    .insertInto("role_assignments")
    .values({ id: randomUUID(), tenant_id: tenantId, user_id: userId, role: "owner" })
    .execute();
  const session = await db
    .insertInto("sessions")
    .values({ id: randomUUID(), tenant_id: tenantId, user_id: userId, expires_at: new Date(Date.now() + 900_000) })
    .returningAll()
    .executeTakeFirstOrThrow();
  return sessionCookieHeader(session.id);
}

/** spec: commerce/order - "Order detail exposes its active payment". */
describe.skipIf(!dbReachable)("GET /orders/:id (live Postgres)", () => {
  it("includes the payment when the order has a pending payment", async () => {
    const { tenantId, order } = await seedTenantWithDraftOrder();

    const paymentId = await db.transaction().execute(async (trx) => {
      await sql`select set_config('app.tenant_id', ${tenantId}, true)`.execute(trx);
      const actorUserId = await ensureCheckoutSystemUserId(trx, tenantId);
      await new TransitionOrderStatusUseCase(new KyselyOrderRepository(trx), new OutboxEventPublisher(trx)).execute({
        tenantId,
        orderId: order.id,
        to: "awaiting_payment",
        actorUserId,
      });
      const { payment } = await new CreatePaymentUseCase(
        new KyselyOrderRepository(trx),
        new KyselyPaymentRepository(trx),
        new FakePaymentProvider(),
      ).execute({ tenantId, orderId: order.id, method: "pix", actorUserId });
      return payment.id;
    });

    const cookie = await seedAuthenticatedStaff(tenantId);
    const app = createApp();
    const res = await request(app).get(`/orders/${order.id}`).set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(res.body.payment).toMatchObject({
      id: paymentId,
      status: "pending",
      method: "pix",
      amountCents: 2500,
      refundedAmountCents: 0,
    });
  });

  it("omits the payment when the order has none", async () => {
    const { tenantId, order } = await seedTenantWithDraftOrder();
    const cookie = await seedAuthenticatedStaff(tenantId);

    const app = createApp();
    const res = await request(app).get(`/orders/${order.id}`).set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(res.body.payment).toBeNull();
  });
});
