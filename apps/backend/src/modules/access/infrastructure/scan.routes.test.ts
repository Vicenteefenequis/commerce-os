import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { sql } from "kysely";
import request from "supertest";
import { createApp } from "../../../http/app.js";
import { db } from "../../../db/kysely.js";
import { sessionCookieHeader } from "../../identity/infrastructure/cookie.js";
import type { Role } from "../../authorization/domain/role.js";

/**
 * spec: access/scan - the six outcomes over the real route, the
 * permission gate, tenant isolation, and the Venue requirement. Requires a
 * reachable Postgres; skips itself when unreachable, same convention as
 * order-detail.routes.test.ts.
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

interface SeedOptions {
  /** ISO calendar date of the Reservation backing the Order line; omitted for a line with no Reservation. */
  reservationPeriod?: string;
  entitlementStatus?: "issued" | "consumed";
}

async function seedScannableTicket(name: string, options: SeedOptions = {}) {
  const tenantId = randomUUID();
  const venueId = randomUUID();
  const otherVenueId = randomUUID();
  const customerId = randomUUID();
  const productId = randomUUID();
  const variantId = randomUUID();
  const resourceId = randomUUID();
  const orderId = randomUUID();
  const orderLineId = randomUUID();
  const entitlementId = randomUUID();
  const code = `TCK-${randomUUID()}`;

  await db.insertInto("organizations").values({ id: tenantId, name }).execute();
  await sql`select set_config('app.tenant_id', ${tenantId}, false)`.execute(db);

  await db
    .insertInto("venues")
    .values([
      { id: venueId, tenant_id: tenantId, name: "Unidade Norte" },
      { id: otherVenueId, tenant_id: tenantId, name: "Unidade Sul" },
    ])
    .execute();
  await db
    .insertInto("customers")
    .values({ id: customerId, tenant_id: tenantId, email: `ana-${customerId}@example.com`, name: "Ana" })
    .execute();
  await db
    .insertInto("products")
    .values({ id: productId, tenant_id: tenantId, venue_id: venueId, name: "Ingresso" })
    .execute();
  await db
    .insertInto("product_variants")
    .values({ id: variantId, tenant_id: tenantId, product_id: productId, name: "Único", price_cents: 2000 })
    .execute();

  let reservationId: string | null = null;
  if (options.reservationPeriod) {
    const commitmentId = randomUUID();
    reservationId = randomUUID();
    await db
      .insertInto("resources")
      .values({
        id: resourceId,
        tenant_id: tenantId,
        venue_id: venueId,
        name: "Portão",
        default_capacity: 100,
        hard_capacity: true,
      })
      .execute();
    await db
      .insertInto("resource_capacity_commitments")
      .values({
        id: commitmentId,
        tenant_id: tenantId,
        resource_id: resourceId,
        period: options.reservationPeriod,
        amount: 1,
        status: "held",
      })
      .execute();
    await db
      .insertInto("reservations")
      .values({
        id: reservationId,
        tenant_id: tenantId,
        resource_id: resourceId,
        period: options.reservationPeriod,
        amount: 1,
        status: "confirmed",
        commitment_id: commitmentId,
        expires_at: new Date(Date.now() + 900_000),
      })
      .execute();
  }

  await db
    .insertInto("orders")
    .values({ id: orderId, tenant_id: tenantId, venue_id: venueId, customer_id: customerId, status: "paid" })
    .execute();
  await db
    .insertInto("order_lines")
    .values({
      id: orderLineId,
      tenant_id: tenantId,
      order_id: orderId,
      variant_id: variantId,
      name: "Ingresso",
      unit_price_cents: 2000,
      quantity: 1,
      reservation_id: reservationId,
    })
    .execute();
  await db
    .insertInto("entitlements")
    .values({
      id: entitlementId,
      tenant_id: tenantId,
      order_id: orderId,
      order_line_id: orderLineId,
      customer_id: customerId,
      status: options.entitlementStatus ?? "issued",
    })
    .execute();
  await db
    .insertInto("tickets")
    .values({ id: randomUUID(), tenant_id: tenantId, entitlement_id: entitlementId, code })
    .execute();

  return { tenantId, venueId, otherVenueId, entitlementId, code };
}

async function seedOperator(tenantId: string, role: Role = "access_operator") {
  const userId = randomUUID();
  await db
    .insertInto("users")
    .values({ id: userId, tenant_id: tenantId, email: `op-${userId}@example.com`, password_hash: "x" })
    .execute();
  await db
    .insertInto("role_assignments")
    .values({ id: randomUUID(), tenant_id: tenantId, user_id: userId, role })
    .execute();
  const session = await db
    .insertInto("sessions")
    .values({ id: randomUUID(), tenant_id: tenantId, user_id: userId, expires_at: new Date(Date.now() + 900_000) })
    .returningAll()
    .executeTakeFirstOrThrow();
  return sessionCookieHeader(session.id);
}

async function entitlementStatus(tenantId: string, entitlementId: string): Promise<string> {
  await sql`select set_config('app.tenant_id', ${tenantId}, false)`.execute(db);
  const row = await db
    .selectFrom("entitlements")
    .selectAll()
    .where("id", "=", entitlementId)
    .executeTakeFirstOrThrow();
  return row.status;
}

async function scanAttempts(tenantId: string) {
  await sql`select set_config('app.tenant_id', ${tenantId}, false)`.execute(db);
  return db.selectFrom("scan_attempts").selectAll().where("tenant_id", "=", tenantId).execute();
}

/** Today, as the ISO calendar date the server itself reckons it. */
function todayPeriod(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

describe.skipIf(!dbReachable)("POST /access/scan (live Postgres)", () => {
  it("authorizes and consumes an issued Entitlement scanned at its own Venue", async () => {
    const seed = await seedScannableTicket("Zoo Scan Autorizado");
    const cookie = await seedOperator(seed.tenantId);

    const res = await request(createApp())
      .post("/access/scan")
      .set("Cookie", cookie)
      .send({ code: seed.code, venueId: seed.venueId });

    expect(res.status).toBe(200);
    expect(res.body.outcome).toBe("authorized");
    expect(res.body.entitlementId).toBe(seed.entitlementId);
    expect(await entitlementStatus(seed.tenantId, seed.entitlementId)).toBe("consumed");
  });

  it("reports a rescan of the same Ticket as already used (spec: Entitlement already consumed)", async () => {
    const seed = await seedScannableTicket("Zoo Scan Repetido");
    const cookie = await seedOperator(seed.tenantId);
    const app = createApp();

    const first = await request(app)
      .post("/access/scan")
      .set("Cookie", cookie)
      .send({ code: seed.code, venueId: seed.venueId });
    const second = await request(app)
      .post("/access/scan")
      .set("Cookie", cookie)
      .send({ code: seed.code, venueId: seed.venueId });

    expect(first.body.outcome).toBe("authorized");
    expect(second.status).toBe(200);
    expect(second.body.outcome).toBe("already_used");

    const attempts = await scanAttempts(seed.tenantId);
    expect(attempts.map((a) => a.outcome).sort()).toEqual(["already_used", "authorized"]);
  });

  it("reports an unknown code as invalid (spec: Unknown or malformed code)", async () => {
    const seed = await seedScannableTicket("Zoo Scan Invalido");
    const cookie = await seedOperator(seed.tenantId);

    const res = await request(createApp())
      .post("/access/scan")
      .set("Cookie", cookie)
      .send({ code: "TCK-nao-existe", venueId: seed.venueId });

    expect(res.status).toBe(200);
    expect(res.body.outcome).toBe("invalid");
    expect(res.body.entitlementId).toBeNull();
    expect(await entitlementStatus(seed.tenantId, seed.entitlementId)).toBe("issued");
  });

  it("reports a scan at another Venue of the same Organization as wrong venue", async () => {
    const seed = await seedScannableTicket("Zoo Scan Local");
    const cookie = await seedOperator(seed.tenantId);

    const res = await request(createApp())
      .post("/access/scan")
      .set("Cookie", cookie)
      .send({ code: seed.code, venueId: seed.otherVenueId });

    expect(res.status).toBe(200);
    expect(res.body.outcome).toBe("wrong_venue");
    expect(await entitlementStatus(seed.tenantId, seed.entitlementId)).toBe("issued");
  });

  it("reports a scan before a Reservation-backed Entitlement's period as wrong time", async () => {
    const seed = await seedScannableTicket("Zoo Scan Cedo", { reservationPeriod: todayPeriod(1) });
    const cookie = await seedOperator(seed.tenantId);

    const res = await request(createApp())
      .post("/access/scan")
      .set("Cookie", cookie)
      .send({ code: seed.code, venueId: seed.venueId });

    expect(res.status).toBe(200);
    expect(res.body.outcome).toBe("wrong_time");
    expect(await entitlementStatus(seed.tenantId, seed.entitlementId)).toBe("issued");
  });

  it("reports a scan after a Reservation-backed Entitlement's period as expired", async () => {
    const seed = await seedScannableTicket("Zoo Scan Tarde", { reservationPeriod: todayPeriod(-1) });
    const cookie = await seedOperator(seed.tenantId);

    const res = await request(createApp())
      .post("/access/scan")
      .set("Cookie", cookie)
      .send({ code: seed.code, venueId: seed.venueId });

    expect(res.status).toBe(200);
    expect(res.body.outcome).toBe("expired");
    expect(await entitlementStatus(seed.tenantId, seed.entitlementId)).toBe("issued");
  });

  it("authorizes a Reservation-backed Entitlement scanned within its period", async () => {
    const seed = await seedScannableTicket("Zoo Scan No Horario", { reservationPeriod: todayPeriod(0) });
    const cookie = await seedOperator(seed.tenantId);

    const res = await request(createApp())
      .post("/access/scan")
      .set("Cookie", cookie)
      .send({ code: seed.code, venueId: seed.venueId });

    expect(res.status).toBe(200);
    expect(res.body.outcome).toBe("authorized");
    expect(await entitlementStatus(seed.tenantId, seed.entitlementId)).toBe("consumed");
  });

  it("records every attempt, authorized or denied (spec: Every scan attempt is recorded)", async () => {
    const seed = await seedScannableTicket("Zoo Scan Registro");
    const cookie = await seedOperator(seed.tenantId);
    const app = createApp();

    await request(app)
      .post("/access/scan")
      .set("Cookie", cookie)
      .send({ code: "TCK-nao-existe", venueId: seed.venueId });
    await request(app).post("/access/scan").set("Cookie", cookie).send({ code: seed.code, venueId: seed.otherVenueId });
    await request(app).post("/access/scan").set("Cookie", cookie).send({ code: seed.code, venueId: seed.venueId });

    const attempts = await scanAttempts(seed.tenantId);
    expect(attempts).toHaveLength(3);
    expect(attempts.map((a) => a.outcome).sort()).toEqual(["authorized", "invalid", "wrong_venue"]);
    const invalidAttempt = attempts.find((a) => a.outcome === "invalid");
    expect(invalidAttempt?.entitlement_id).toBeNull();
    expect(invalidAttempt?.ticket_code).toBe("TCK-nao-existe");
  });

  it("denies an identity without entitlement:consume (spec: Scanning requires the entitlement:consume permission)", async () => {
    const seed = await seedScannableTicket("Zoo Scan Sem Permissao");
    const cookie = await seedOperator(seed.tenantId, "sales");

    const res = await request(createApp())
      .post("/access/scan")
      .set("Cookie", cookie)
      .send({ code: seed.code, venueId: seed.venueId });

    expect(res.status).toBe(403);
    expect(await entitlementStatus(seed.tenantId, seed.entitlementId)).toBe("issued");
    expect(await scanAttempts(seed.tenantId)).toHaveLength(0);
  });

  it("denies an unauthenticated request", async () => {
    const seed = await seedScannableTicket("Zoo Scan Sem Sessao");

    const res = await request(createApp()).post("/access/scan").send({ code: seed.code, venueId: seed.venueId });

    expect(res.status).toBe(401);
    expect(await entitlementStatus(seed.tenantId, seed.entitlementId)).toBe("issued");
  });

  it("treats a Ticket from another Organization exactly like an unknown code (spec: Access Control is isolated by tenant)", async () => {
    const owner = await seedScannableTicket("Zoo Scan Tenant A");
    const other = await seedScannableTicket("Zoo Scan Tenant B");
    const cookie = await seedOperator(other.tenantId);

    const res = await request(createApp())
      .post("/access/scan")
      .set("Cookie", cookie)
      .send({ code: owner.code, venueId: other.venueId });

    expect(res.status).toBe(200);
    expect(res.body.outcome).toBe("invalid");
    expect(res.body.entitlementId).toBeNull();
    expect(await entitlementStatus(owner.tenantId, owner.entitlementId)).toBe("issued");
  });

  it("rejects a request with no venueId before looking the Ticket up (spec: Scan without a selected Venue is rejected)", async () => {
    const seed = await seedScannableTicket("Zoo Scan Sem Venue");
    const cookie = await seedOperator(seed.tenantId);

    const res = await request(createApp()).post("/access/scan").set("Cookie", cookie).send({ code: seed.code });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/venueId/);
    expect(await entitlementStatus(seed.tenantId, seed.entitlementId)).toBe("issued");
    expect(await scanAttempts(seed.tenantId)).toHaveLength(0);
  });

  it("rejects a venueId from another Organization (design.md D1)", async () => {
    const seed = await seedScannableTicket("Zoo Scan Venue Alheio");
    const other = await seedScannableTicket("Zoo Scan Venue Alheio Dono");
    const cookie = await seedOperator(seed.tenantId);

    const res = await request(createApp())
      .post("/access/scan")
      .set("Cookie", cookie)
      .send({ code: seed.code, venueId: other.venueId });

    expect(res.status).toBe(400);
    expect(await entitlementStatus(seed.tenantId, seed.entitlementId)).toBe("issued");
    expect(await scanAttempts(seed.tenantId)).toHaveLength(0);
  });

  it("rejects a request with no code", async () => {
    const seed = await seedScannableTicket("Zoo Scan Sem Codigo");
    const cookie = await seedOperator(seed.tenantId);

    const res = await request(createApp()).post("/access/scan").set("Cookie", cookie).send({ venueId: seed.venueId });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/code/);
    expect(await scanAttempts(seed.tenantId)).toHaveLength(0);
  });
});
