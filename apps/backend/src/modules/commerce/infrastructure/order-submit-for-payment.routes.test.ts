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
import { CreateOrderUseCase } from "../application/create-order.usecase.js";
import { KyselyOrderRepository } from "./order-repository.kysely.js";
import { ensureCheckoutSystemUserId } from "./system-user.kysely.js";

/** spec: commerce/checkout - "Checkout can be submitted for payment". */
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

async function seedDraftOrder() {
  const tenantId = randomUUID();
  const venueId = randomUUID();

  await db.insertInto("organizations").values({ id: tenantId, name: "Zoo Submit" }).execute();
  await sql`select set_config('app.tenant_id', ${tenantId}, false)`.execute(db);
  await db.insertInto("venues").values({ id: venueId, tenant_id: tenantId, name: "Unidade" }).execute();

  const variantId = await db.transaction().execute(async (trx) => {
    await sql`select set_config('app.tenant_id', ${tenantId}, true)`.execute(trx);
    const product = await new KyselyProductRepository(trx).create({
      id: randomUUID(),
      tenantId,
      venueId,
      name: "Ingresso",
      variants: [{ id: randomUUID(), name: "Único", priceCents: 2000 }],
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
      new OutboxEventPublisher(trx),
    ).execute({
      tenantId,
      venueId,
      lines: [{ variantId, quantity: 1 }],
      holdExpiresAt: new Date(Date.now() + 900_000),
      actorUserId,
    });
  });

  return { tenantId, order };
}

describe.skipIf(!dbReachable)("POST /orders/:id/submit-for-payment (live Postgres)", () => {
  it("moves a draft order to awaiting_payment without a session", async () => {
    const { tenantId, order } = await seedDraftOrder();
    const app = createApp();

    const res = await request(app).post(`/orders/${order.id}/submit-for-payment`).send({ tenantId });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("awaiting_payment");
  });

  it("rejects submitting an order that is not draft", async () => {
    const { tenantId, order } = await seedDraftOrder();
    const app = createApp();

    await request(app).post(`/orders/${order.id}/submit-for-payment`).send({ tenantId });
    const second = await request(app).post(`/orders/${order.id}/submit-for-payment`).send({ tenantId });

    expect(second.status).toBe(409);
  });
});
