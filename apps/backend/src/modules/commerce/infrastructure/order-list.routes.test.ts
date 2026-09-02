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
import { KyselyCustomerRepository } from "../../customer/infrastructure/customer-repository.kysely.js";
import { KyselyOrderRepository } from "./order-repository.kysely.js";
import { ensureCheckoutSystemUserId } from "./system-user.kysely.js";

/** spec: commerce/order - "Orders can be listed by tenant". */
describe("GET /orders", () => {
  it("rejects an unauthenticated request", async () => {
    const app = createApp();
    const res = await request(app).get("/orders");
    expect(res.status).toBe(401);
  });
});

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

async function seedOrder(
  tenantId: string,
  venueId: string,
  name: string,
  customer: { email: string; name: string } = { email: "ana@example.com", name: "Ana" },
) {
  const variantId = await db.transaction().execute(async (trx) => {
    await sql`select set_config('app.tenant_id', ${tenantId}, true)`.execute(trx);
    const product = await new KyselyProductRepository(trx).create({
      id: randomUUID(),
      tenantId,
      venueId,
      name,
      variants: [{ id: randomUUID(), name: "Único", priceCents: 1500 }],
    });
    return product.variants[0]!.id;
  });

  return db.transaction().execute(async (trx) => {
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
      customer,
      lines: [{ variantId, quantity: 1 }],
      holdExpiresAt: new Date(Date.now() + 900_000),
      actorUserId,
    });
  });
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

describe.skipIf(!dbReachable)("GET /orders (live Postgres)", () => {
  it("returns every order for the caller's tenant, and none from another tenant", async () => {
    const tenantAId = randomUUID();
    const tenantBId = randomUUID();
    const venueAId = randomUUID();
    const venueBId = randomUUID();

    await db.insertInto("organizations").values([
      { id: tenantAId, name: "Zoo A", slug: tenantAId },
      { id: tenantBId, name: "Zoo B", slug: tenantBId },
    ]).execute();
    await sql`select set_config('app.tenant_id', ${tenantAId}, false)`.execute(db);
    await db.insertInto("venues").values({ id: venueAId, tenant_id: tenantAId, name: "Unidade A", slug: venueAId }).execute();
    await sql`select set_config('app.tenant_id', ${tenantBId}, false)`.execute(db);
    await db.insertInto("venues").values({ id: venueBId, tenant_id: tenantBId, name: "Unidade B", slug: venueBId }).execute();

    const orderA1 = await seedOrder(tenantAId, venueAId, "Ingresso A1");
    const orderA2 = await seedOrder(tenantAId, venueAId, "Ingresso A2");
    const orderB = await seedOrder(tenantBId, venueBId, "Ingresso B");

    const cookie = await seedAuthenticatedStaff(tenantAId);

    const app = createApp();
    const res = await request(app).get("/orders").set("Cookie", cookie);

    expect(res.status).toBe(200);
    const returnedIds = (res.body.orders as Array<{ id: string }>).map((o) => o.id);
    expect(returnedIds).toContain(orderA1.id);
    expect(returnedIds).toContain(orderA2.id);
    expect(returnedIds).not.toContain(orderB.id);
  });

  it("filters by order id, customer, and status, tenant-isolated", async () => {
    const tenantAId = randomUUID();
    const tenantBId = randomUUID();
    const venueAId = randomUUID();
    const venueBId = randomUUID();

    await db.insertInto("organizations").values([
      { id: tenantAId, name: "Zoo A", slug: tenantAId },
      { id: tenantBId, name: "Zoo B", slug: tenantBId },
    ]).execute();
    await sql`select set_config('app.tenant_id', ${tenantAId}, false)`.execute(db);
    await db.insertInto("venues").values({ id: venueAId, tenant_id: tenantAId, name: "Unidade A", slug: venueAId }).execute();
    await sql`select set_config('app.tenant_id', ${tenantBId}, false)`.execute(db);
    await db.insertInto("venues").values({ id: venueBId, tenant_id: tenantBId, name: "Unidade B", slug: venueBId }).execute();

    const orderAna = await seedOrder(tenantAId, venueAId, "Ingresso Ana", {
      email: "ana@example.com",
      name: "Ana",
    });
    const orderBruno = await seedOrder(tenantAId, venueAId, "Ingresso Bruno", {
      email: "bruno@example.com",
      name: "Bruno",
    });
    const orderB = await seedOrder(tenantBId, venueBId, "Ingresso B", {
      email: "ana@example.com",
      name: "Ana",
    });

    const cookie = await seedAuthenticatedStaff(tenantAId);
    const app = createApp();

    const byId = await request(app).get(`/orders?id=${orderAna.id}`).set("Cookie", cookie);
    expect(byId.status).toBe(200);
    expect((byId.body.orders as Array<{ id: string }>).map((o) => o.id)).toEqual([orderAna.id]);

    const byCustomer = await request(app).get("/orders?customer=bruno").set("Cookie", cookie);
    expect(byCustomer.status).toBe(200);
    expect((byCustomer.body.orders as Array<{ id: string }>).map((o) => o.id)).toEqual([orderBruno.id]);

    const byStatus = await request(app).get("/orders?status=draft").set("Cookie", cookie);
    expect(byStatus.status).toBe(200);
    const byStatusIds = (byStatus.body.orders as Array<{ id: string }>).map((o) => o.id);
    expect(byStatusIds).toContain(orderAna.id);
    expect(byStatusIds).toContain(orderBruno.id);
    expect(byStatusIds).not.toContain(orderB.id);

    const combined = await request(app).get("/orders?customer=ana&status=draft").set("Cookie", cookie);
    expect(combined.status).toBe(200);
    expect((combined.body.orders as Array<{ id: string }>).map((o) => o.id)).toEqual([orderAna.id]);

    const invalidStatus = await request(app).get("/orders?status=bogus").set("Cookie", cookie);
    expect(invalidStatus.status).toBe(400);
  });
});
