import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { sql } from "kysely";
import request from "supertest";
import { createApp } from "../../../http/app.js";
import { db } from "../../../db/kysely.js";
import { sessionCookieHeader } from "../../identity/infrastructure/cookie.js";

/**
 * spec: foundation/venue - "Venue profile fields are owner-editable",
 * "Venue publish toggle is owner-controlled". Requires a reachable
 * Postgres; skips itself when unreachable, same convention as
 * dashboard.routes.test.ts.
 */
describe("PATCH /venues/:id", () => {
  it("rejects an unauthenticated request", async () => {
    const app = createApp();
    const res = await request(app).patch(`/venues/${randomUUID()}`).send({ published: true });
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

async function seedOwner(tenantId: string) {
  const userId = randomUUID();
  await db
    .insertInto("users")
    .values({ id: userId, tenant_id: tenantId, email: `owner-${userId}@example.com`, password_hash: "x" })
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

async function seedTenantWithVenue(name: string) {
  const tenantId = randomUUID();
  const venueId = randomUUID();
  await db.insertInto("organizations").values({ id: tenantId, name, slug: `${name}-${tenantId.slice(0, 8)}` }).execute();
  await sql`select set_config('app.tenant_id', ${tenantId}, false)`.execute(db);
  await db
    .insertInto("venues")
    .values({ id: venueId, tenant_id: tenantId, name: `${name} Venue`, slug: `venue-${venueId.slice(0, 8)}` })
    .execute();
  return { tenantId, venueId };
}

describe.skipIf(!dbReachable)("PATCH /venues/:id (live Postgres)", () => {
  it("updates profile fields and the publish toggle for the owning tenant", async () => {
    const { tenantId, venueId } = await seedTenantWithVenue("Bar do Zé");
    const cookie = await seedOwner(tenantId);

    const app = createApp();
    const res = await request(app)
      .patch(`/venues/${venueId}`)
      .set("Cookie", cookie)
      .send({ description: "Um bar", city: "São Paulo", category: "Bar", published: true });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      description: "Um bar",
      city: "São Paulo",
      category: "Bar",
      published: true,
    });
  });

  it("rejects a malformed cover photo URL", async () => {
    const { tenantId, venueId } = await seedTenantWithVenue("Bar do Zé");
    const cookie = await seedOwner(tenantId);

    const app = createApp();
    const res = await request(app)
      .patch(`/venues/${venueId}`)
      .set("Cookie", cookie)
      .send({ coverPhotoUrl: "not-a-url" });

    expect(res.status).toBe(400);
  });

  it("denies an actor outside the owning organization", async () => {
    const { venueId } = await seedTenantWithVenue("Bar do Zé");
    const { tenantId: otherTenantId } = await seedTenantWithVenue("Outro Bar");
    const cookie = await seedOwner(otherTenantId);

    const app = createApp();
    const res = await request(app)
      .patch(`/venues/${venueId}`)
      .set("Cookie", cookie)
      .send({ published: true });

    expect(res.status).toBe(404);
  });
});
