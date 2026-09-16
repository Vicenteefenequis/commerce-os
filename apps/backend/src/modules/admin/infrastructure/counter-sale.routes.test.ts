import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { sql } from "kysely";
import request from "supertest";
import { createApp } from "../../../http/app.js";
import { db } from "../../../db/kysely.js";
import { sessionCookieHeader } from "../../identity/infrastructure/cookie.js";
import { KyselyProductRepository } from "../../catalog/infrastructure/product-repository.kysely.js";
import { getOutboxConsumersFor } from "../../../events/outbox-consumer-registry.js";
import { registerAllConsumers } from "../../../worker/register-consumers.js";

/**
 * spec: admin/counter-sale. Requires a reachable Postgres; skips itself
 * when unreachable, same convention as dashboard.routes.test.ts.
 */
let dbReachable = true;

beforeAll(async () => {
  try {
    await sql`select 1`.execute(db);
    registerAllConsumers();
  } catch {
    dbReachable = false;
  }
});

async function processOutbox(tenantId: string) {
  await sql`select set_config('app.tenant_id', ${tenantId}, false)`.execute(db);
  const pendingEvents = await db
    .selectFrom("outbox_events")
    .selectAll()
    .where("tenant_id", "=", tenantId)
    .where("processed_at", "is", null)
    .execute();
  for (const pending of pendingEvents) {
    await db.transaction().execute(async (trx) => {
      await sql`select set_config('app.tenant_id', ${pending.tenant_id}, true)`.execute(trx);
      for (const consumer of getOutboxConsumersFor(pending.event_type)) {
        await consumer(
          { id: pending.id, tenantId: pending.tenant_id, type: pending.event_type, payload: pending.payload },
          trx,
        );
      }
      await trx.updateTable("outbox_events").set({ processed_at: new Date() }).where("id", "=", pending.id).execute();
    });
  }
}

afterAll(async () => {
  if (dbReachable) {
    await db.destroy();
  }
});

async function seedTenant(name: string) {
  const tenantId = randomUUID();
  const venueId = randomUUID();
  const resourceId = randomUUID();
  const userId = randomUUID();

  await db.insertInto("organizations").values({ id: tenantId, name, slug: tenantId }).execute();
  await sql`select set_config('app.tenant_id', ${tenantId}, false)`.execute(db);
  await db.insertInto("venues").values({ id: venueId, tenant_id: tenantId, name: "Unidade", slug: venueId }).execute();
  await db
    .insertInto("resources")
    .values({
      id: resourceId,
      tenant_id: tenantId,
      venue_id: venueId,
      name: "Portão",
      default_capacity: 2,
      hard_capacity: true,
    })
    .execute();
  await db
    .insertInto("users")
    .values({ id: userId, tenant_id: tenantId, email: `staff-${userId}@example.com`, password_hash: "x" })
    .execute();
  await db
    .insertInto("role_assignments")
    .values({ id: randomUUID(), tenant_id: tenantId, user_id: userId, role: "vendedor" })
    .execute();
  const session = await db
    .insertInto("sessions")
    .values({ id: randomUUID(), tenant_id: tenantId, user_id: userId, expires_at: new Date(Date.now() + 900_000) })
    .returningAll()
    .executeTakeFirstOrThrow();

  const bookedVariantId = await db.transaction().execute(async (trx) => {
    await sql`select set_config('app.tenant_id', ${tenantId}, true)`.execute(trx);
    const product = await new KyselyProductRepository(trx).create({
      id: randomUUID(),
      tenantId,
      venueId,
      name: "Ingresso",
      variants: [{ id: randomUUID(), name: "Inteira", priceCents: 5000, resourceId }],
    });
    return product.variants[0]!.id;
  });

  const freeVariantId = await db.transaction().execute(async (trx) => {
    await sql`select set_config('app.tenant_id', ${tenantId}, true)`.execute(trx);
    const product = await new KyselyProductRepository(trx).create({
      id: randomUUID(),
      tenantId,
      venueId,
      name: "Camiseta",
      variants: [{ id: randomUUID(), name: "Único", priceCents: 3000 }],
    });
    return product.variants[0]!.id;
  });

  return {
    tenantId,
    venueId,
    resourceId,
    bookedVariantId,
    freeVariantId,
    cookie: sessionCookieHeader(session.id),
  };
}

describe("POST /counter-sales", () => {
  it("rejects an unauthenticated request", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/counter-sales")
      .send({ venueId: randomUUID(), lines: [{ variantId: randomUUID(), quantity: 1 }] });
    expect(res.status).toBe(401);
  });
});

describe.skipIf(!dbReachable)("POST /counter-sales (live Postgres)", () => {
  it("completes a walk-in sale with no buyer info as a paid, counter-channel order with a succeeded cash payment", async () => {
    const { venueId, freeVariantId, cookie } = await seedTenant("Zoo Counter");
    const app = createApp();

    const res = await request(app)
      .post("/counter-sales")
      .set("Cookie", cookie)
      .send({ venueId, lines: [{ variantId: freeVariantId, quantity: 2 }] });

    expect(res.status).toBe(201);
    expect(res.body.order.status).toBe("paid");
    expect(res.body.order.channel).toBe("counter");
    expect(res.body.order.totalCents).toBe(6000);
    expect(res.body.payment.status).toBe("succeeded");
    expect(res.body.payment.method).toBe("cash");
  });

  it("resolves a real customer when buyer info is provided", async () => {
    const { tenantId, venueId, freeVariantId, cookie } = await seedTenant("Zoo Counter Buyer");
    const app = createApp();

    const res = await request(app)
      .post("/counter-sales")
      .set("Cookie", cookie)
      .send({ venueId, lines: [{ variantId: freeVariantId, quantity: 1 }], customer: { email: "ana@example.com", name: "Ana" } });

    expect(res.status).toBe(201);

    await sql`select set_config('app.tenant_id', ${tenantId}, false)`.execute(db);
    const customerRow = await db
      .selectFrom("customers")
      .selectAll()
      .where("tenant_id", "=", tenantId)
      .where("email", "=", "ana@example.com")
      .executeTakeFirstOrThrow();
    expect(customerRow.name).toBe("Ana");
  });

  it("issues one Entitlement and one Ticket per unit, exactly as a storefront order would, via the existing paid-transition trigger", async () => {
    const { tenantId, venueId, freeVariantId, cookie } = await seedTenant("Zoo Counter Ticketing");
    const app = createApp();

    const res = await request(app)
      .post("/counter-sales")
      .set("Cookie", cookie)
      .send({ venueId, lines: [{ variantId: freeVariantId, quantity: 2 }] });

    expect(res.status).toBe(201);
    const orderId = res.body.order.id;

    await processOutbox(tenantId);

    await sql`select set_config('app.tenant_id', ${tenantId}, false)`.execute(db);
    const entitlements = await db
      .selectFrom("entitlements")
      .selectAll()
      .where("tenant_id", "=", tenantId)
      .where("order_id", "=", orderId)
      .execute();
    expect(entitlements).toHaveLength(2);

    const tickets = await db
      .selectFrom("tickets")
      .selectAll()
      .where("tenant_id", "=", tenantId)
      .where(
        "entitlement_id",
        "in",
        entitlements.map((e) => e.id),
      )
      .execute();
    expect(tickets).toHaveLength(2);
  });

  it("rejects a sale exceeding available capacity and creates no order or payment", async () => {
    const { tenantId, venueId, bookedVariantId, cookie } = await seedTenant("Zoo Counter Capacity");
    const app = createApp();

    const res = await request(app)
      .post("/counter-sales")
      .set("Cookie", cookie)
      .send({ venueId, lines: [{ variantId: bookedVariantId, quantity: 3, period: "2026-06-15" }] });

    expect(res.status).toBe(409);

    await sql`select set_config('app.tenant_id', ${tenantId}, false)`.execute(db);
    const orders = await db.selectFrom("orders").selectAll().where("tenant_id", "=", tenantId).execute();
    expect(orders).toHaveLength(0);
    const payments = await db.selectFrom("payments").selectAll().where("tenant_id", "=", tenantId).execute();
    expect(payments).toHaveLength(0);
  });
});
