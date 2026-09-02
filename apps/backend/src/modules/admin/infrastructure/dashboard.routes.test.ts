import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { sql } from "kysely";
import request from "supertest";
import { createApp } from "../../../http/app.js";
import { db } from "../../../db/kysely.js";
import { sessionCookieHeader } from "../../identity/infrastructure/cookie.js";

/**
 * spec: admin/dashboard - tenant/venue/period-scoped sales, order, and
 * visitor summary. Requires a reachable Postgres; skips itself when
 * unreachable, same convention as order-list.routes.test.ts.
 */
describe("GET /dashboard/summary", () => {
  it("rejects an unauthenticated request", async () => {
    const app = createApp();
    const res = await request(app).get("/dashboard/summary?from=2026-01-01&to=2026-01-02");
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

async function seedVariant(tenantId: string, venueId: string) {
  const productId = randomUUID();
  const variantId = randomUUID();
  await db
    .insertInto("products")
    .values({ id: productId, tenant_id: tenantId, venue_id: venueId, name: "Ingresso" })
    .execute();
  await db
    .insertInto("product_variants")
    .values({ id: variantId, tenant_id: tenantId, product_id: productId, name: "Único", price_cents: 1 })
    .execute();
  return variantId;
}

async function seedOrder(
  tenantId: string,
  venueId: string,
  status: "draft" | "paid" | "fulfilled" | "refunded" | "cancelled",
  unitPriceCents: number,
  createdAt: Date,
) {
  const customerId = randomUUID();
  const orderId = randomUUID();
  const variantId = await seedVariant(tenantId, venueId);

  await db
    .insertInto("customers")
    .values({ id: customerId, tenant_id: tenantId, email: `c-${customerId}@example.com`, name: "Cliente" })
    .execute();
  await db
    .insertInto("orders")
    .values({ id: orderId, tenant_id: tenantId, venue_id: venueId, customer_id: customerId, status })
    .execute();
  await db
    .updateTable("orders")
    .set({ created_at: sql`${createdAt.toISOString()}::timestamptz` })
    .where("id", "=", orderId)
    .execute();
  await db
    .insertInto("order_lines")
    .values({
      id: randomUUID(),
      tenant_id: tenantId,
      order_id: orderId,
      variant_id: variantId,
      name: "Ingresso",
      unit_price_cents: unitPriceCents,
      quantity: 1,
    })
    .execute();

  return orderId;
}

async function seedScanAttempt(
  tenantId: string,
  venueId: string,
  outcome: "authorized" | "invalid",
  scannedAt: Date,
) {
  await db
    .insertInto("scan_attempts")
    .values({
      id: randomUUID(),
      tenant_id: tenantId,
      entitlement_id: null,
      ticket_code: `TCK-${randomUUID()}`,
      venue_id: venueId,
      outcome,
      scanned_at: scannedAt,
    })
    .execute();
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

describe.skipIf(!dbReachable)("GET /dashboard/summary (live Postgres)", () => {
  it("reports GMV, order counts, and visitor entries scoped by tenant and period", async () => {
    const tenantAId = randomUUID();
    const tenantBId = randomUUID();
    const venueAId = randomUUID();
    const venueA2Id = randomUUID();
    const venueBId = randomUUID();

    await db.insertInto("organizations").values([
      { id: tenantAId, name: "Zoo A", slug: tenantAId },
      { id: tenantBId, name: "Zoo B", slug: tenantBId },
    ]).execute();
    await sql`select set_config('app.tenant_id', ${tenantAId}, false)`.execute(db);
    await db
      .insertInto("venues")
      .values([
        { id: venueAId, tenant_id: tenantAId, name: "Unidade A", slug: venueAId },
        { id: venueA2Id, tenant_id: tenantAId, name: "Unidade A2", slug: venueA2Id },
      ])
      .execute();
    await sql`select set_config('app.tenant_id', ${tenantBId}, false)`.execute(db);
    await db.insertInto("venues").values({ id: venueBId, tenant_id: tenantBId, name: "Unidade B", slug: venueBId }).execute();
    await sql`select set_config('app.tenant_id', ${tenantAId}, false)`.execute(db);

    const inRangeStart = new Date("2026-06-01T00:00:00Z");
    const inRangeEnd = new Date("2026-06-30T00:00:00Z");
    const inRange = new Date("2026-06-15T00:00:00Z");
    const outOfRange = new Date("2026-05-01T00:00:00Z");

    // In range, venue A, GMV-counted.
    await seedOrder(tenantAId, venueAId, "paid", 5000, inRange);
    await seedOrder(tenantAId, venueAId, "fulfilled", 3000, inRange);
    await seedOrder(tenantAId, venueAId, "refunded", 2000, inRange);
    // In range, venue A, not GMV-counted.
    await seedOrder(tenantAId, venueAId, "draft", 9000, inRange);
    await seedOrder(tenantAId, venueAId, "cancelled", 9000, inRange);
    // In range, venue A2 (different venue, same tenant).
    await seedOrder(tenantAId, venueA2Id, "paid", 1000, inRange);
    // Out of range.
    await seedOrder(tenantAId, venueAId, "paid", 7000, outOfRange);
    // Other tenant.
    await seedOrder(tenantBId, venueBId, "paid", 4000, inRange);

    await seedScanAttempt(tenantAId, venueAId, "authorized", inRange);
    await seedScanAttempt(tenantAId, venueAId, "authorized", inRange);
    await seedScanAttempt(tenantAId, venueAId, "invalid", inRange);
    await seedScanAttempt(tenantAId, venueA2Id, "authorized", inRange);
    await seedScanAttempt(tenantAId, venueAId, "authorized", outOfRange);
    await seedScanAttempt(tenantBId, venueBId, "authorized", inRange);

    const cookie = await seedAuthenticatedStaff(tenantAId);
    const app = createApp();

    const all = await request(app)
      .get(`/dashboard/summary?from=${inRangeStart.toISOString()}&to=${inRangeEnd.toISOString()}`)
      .set("Cookie", cookie);

    expect(all.status).toBe(200);
    // GMV: 5000 (paid) + 3000 (fulfilled) + 2000 (refunded) + 1000 (venue A2 paid) = 11000.
    expect(all.body.sales.gmvCents).toBe(11000);
    expect(all.body.sales.averageOrderValueCents).toBe(11000 / 4);
    expect(all.body.orders.countsByStatus.paid).toBe(2);
    expect(all.body.orders.countsByStatus.fulfilled).toBe(1);
    expect(all.body.orders.countsByStatus.refunded).toBe(1);
    expect(all.body.orders.countsByStatus.draft).toBe(1);
    expect(all.body.orders.countsByStatus.cancelled).toBe(1);
    // Visitors: 2 (venue A) + 1 (venue A2) = 3; excludes invalid and out-of-range.
    expect(all.body.visitors.authorizedCount).toBe(3);

    const venueScoped = await request(app)
      .get(
        `/dashboard/summary?venueId=${venueAId}&from=${inRangeStart.toISOString()}&to=${inRangeEnd.toISOString()}`,
      )
      .set("Cookie", cookie);

    expect(venueScoped.status).toBe(200);
    expect(venueScoped.body.sales.gmvCents).toBe(10000);
    expect(venueScoped.body.visitors.authorizedCount).toBe(2);

    const noData = await request(app)
      .get("/dashboard/summary?from=2020-01-01T00:00:00Z&to=2020-01-02T00:00:00Z")
      .set("Cookie", cookie);

    expect(noData.status).toBe(200);
    expect(noData.body.sales.gmvCents).toBe(0);
    expect(noData.body.sales.averageOrderValueCents).toBe(0);
    expect(noData.body.visitors.authorizedCount).toBe(0);
  });

  it("rejects a request missing from/to", async () => {
    const tenantId = randomUUID();
    await db.insertInto("organizations").values({ id: tenantId, name: "Zoo", slug: tenantId }).execute();
    await sql`select set_config('app.tenant_id', ${tenantId}, false)`.execute(db);
    const cookie = await seedAuthenticatedStaff(tenantId);

    const app = createApp();
    const res = await request(app).get("/dashboard/summary").set("Cookie", cookie);
    expect(res.status).toBe(400);
  });
});
