import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { sql } from "kysely";
import request from "supertest";
import { createApp } from "../../../http/app.js";
import { db } from "../../../db/kysely.js";
import { OutboxEventPublisher } from "../../../events/outbox-publisher.js";
import { KyselyProductRepository } from "../../catalog/infrastructure/product-repository.kysely.js";
import { KyselyResourceRepository } from "../../capacity/infrastructure/resource-repository.kysely.js";
import { KyselyCapacityCommitmentRepository } from "../../capacity/infrastructure/capacity-commitment-repository.kysely.js";
import { KyselyReservationRepository } from "../../capacity/infrastructure/reservation-repository.kysely.js";
import { CreateOrderUseCase } from "../../commerce/application/create-order.usecase.js";
import { TransitionOrderStatusUseCase } from "../../commerce/application/transition-order-status.usecase.js";
import { KyselyOrderRepository } from "../../commerce/infrastructure/order-repository.kysely.js";
import { KyselyCustomerRepository } from "../../customer/infrastructure/customer-repository.kysely.js";
import { ensureCheckoutSystemUserId } from "../../commerce/infrastructure/system-user.kysely.js";
import { CreatePaymentUseCase } from "../application/create-payment.usecase.js";
import type {
  CreateIntentInput,
  CreateIntentResult,
  PaymentProviderPort,
  ProviderWebhookEvent,
  RefundInput,
  RefundResult,
} from "../domain/ports.js";
import { KyselyPaymentRepository } from "./payment-repository.kysely.js";

/** spec: payments/payment - refund is admin-initiated (design.md), same posture as order cancellation. */
describe("POST /payments/:id/refund", () => {
  it("rejects an unauthenticated request", async () => {
    const app = createApp();
    const res = await request(app).post(`/payments/${randomUUID()}/refund`).send({ amountCents: 1000 });
    expect(res.status).toBe(401);
  });
});

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

/** spec: payments/payment - "Payment status can be checked without an authenticated session". */
describe.skipIf(!dbReachable)("GET /payments/:id/status (live Postgres)", () => {
  it("returns only the status, with no session and no cookie", async () => {
    const tenantId = randomUUID();
    const venueId = randomUUID();
    await db.insertInto("organizations").values({ id: tenantId, name: "Zoo Status Route", slug: tenantId }).execute();
    await sql`select set_config('app.tenant_id', ${tenantId}, false)`.execute(db);
    await db.insertInto("venues").values({ id: venueId, tenant_id: tenantId, name: "Unidade", slug: venueId }).execute();

    const variantId = await db.transaction().execute(async (trx) => {
      await sql`select set_config('app.tenant_id', ${tenantId}, true)`.execute(trx);
      const product = await new KyselyProductRepository(trx).create({
        id: randomUUID(),
        tenantId,
        venueId,
        name: "Ingresso",
        variants: [{ id: randomUUID(), name: "Único", priceCents: 3000 }],
      });
      return product.variants[0]!.id;
    });

    const { orderId, paymentId } = await db.transaction().execute(async (trx) => {
      await sql`select set_config('app.tenant_id', ${tenantId}, true)`.execute(trx);
      const actorUserId = await ensureCheckoutSystemUserId(trx, tenantId);
      const order = await new CreateOrderUseCase(
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
      ).execute({ tenantId, orderId: order.id, method: "card", actorUserId });
      return { orderId: order.id, paymentId: payment.id };
    });

    const app = createApp();
    const res = await request(app).get(`/payments/${paymentId}/status`).query({ tenantId });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "pending" });
    expect(orderId).toBeTruthy();
  });

  it("requires a tenantId", async () => {
    const app = createApp();
    const res = await request(app).get(`/payments/${randomUUID()}/status`);
    expect(res.status).toBe(400);
  });

  it("returns 404 for an unknown payment", async () => {
    const app = createApp();
    const res = await request(app).get(`/payments/${randomUUID()}/status`).query({ tenantId: randomUUID() });
    expect(res.status).toBe(404);
  });
});
