import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { sql } from "kysely";
import request from "supertest";
import { createApp } from "../../../http/app.js";
import { db } from "../../../db/kysely.js";
import { sessionCookieHeader } from "../../identity/infrastructure/cookie.js";
import type { Role } from "../../authorization/domain/role.js";

/**
 * spec: foundation/user-management. Requires a reachable Postgres; skips
 * itself when unreachable, same convention as venue.routes.test.ts.
 */
describe("GET /users", () => {
  it("rejects an unauthenticated request", async () => {
    const res = await request(createApp()).get("/users");
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

async function seedStaff(tenantId: string, role: Role, venueId: string | null = null) {
  const userId = randomUUID();
  await db
    .insertInto("users")
    .values({ id: userId, tenant_id: tenantId, email: `staff-${userId}@example.com`, password_hash: "x" })
    .execute();
  await db
    .insertInto("role_assignments")
    .values({ id: randomUUID(), tenant_id: tenantId, user_id: userId, role, venue_id: venueId })
    .execute();
  const session = await db
    .insertInto("sessions")
    .values({ id: randomUUID(), tenant_id: tenantId, user_id: userId, expires_at: new Date(Date.now() + 900_000) })
    .returningAll()
    .executeTakeFirstOrThrow();
  return { userId, cookie: sessionCookieHeader(session.id) };
}

describe.skipIf(!dbReachable)("foundation/user-management (live Postgres)", () => {
  it("denies a non-admin from listing users (spec: Non-admin request is denied)", async () => {
    const { tenantId, venueId } = await seedTenantWithVenue("Zoo Users Denied");
    const { cookie } = await seedStaff(tenantId, "gerente", venueId);

    const res = await request(createApp()).get("/users").set("Cookie", cookie);
    expect(res.status).toBe(403);
  });

  it("lets an Admin list the organization's users with their assignments (spec: Admin lists the organization's users)", async () => {
    const { tenantId, venueId } = await seedTenantWithVenue("Zoo Users List");
    const { cookie } = await seedStaff(tenantId, "admin");
    const { userId: vendedorUserId } = await seedStaff(tenantId, "vendedor", venueId);

    const res = await request(createApp()).get("/users").set("Cookie", cookie);
    expect(res.status).toBe(200);
    const vendedorEntry = (res.body.users as Array<{ userId: string; assignments: unknown[] }>).find(
      (u) => u.userId === vendedorUserId,
    );
    expect(vendedorEntry?.assignments).toEqual([{ id: expect.any(String), role: "vendedor", venueId }]);
  });

  it("creates a Venue-scoped role assignment (spec: Role assignment specifies a role and, when required, a Venue)", async () => {
    const { tenantId, venueId } = await seedTenantWithVenue("Zoo Users Create");
    const { cookie } = await seedStaff(tenantId, "admin");
    const { userId: targetUserId } = await seedStaff(tenantId, "vendedor", venueId);

    const res = await request(createApp())
      .post("/users/role-assignments")
      .set("Cookie", cookie)
      .send({ userId: targetUserId, role: "validador", venueId });

    expect(res.status).toBe(201);

    const list = await request(createApp()).get("/users").set("Cookie", cookie);
    const entry = (list.body.users as Array<{ userId: string; assignments: Array<{ role: string }> }>).find(
      (u) => u.userId === targetUserId,
    );
    expect(entry?.assignments.map((a) => a.role).sort()).toEqual(["validador", "vendedor"]);
  });

  it("rejects creating a non-admin assignment without a Venue", async () => {
    const { tenantId, venueId } = await seedTenantWithVenue("Zoo Users Reject");
    const { cookie } = await seedStaff(tenantId, "admin");
    const { userId: targetUserId } = await seedStaff(tenantId, "vendedor", venueId);

    const res = await request(createApp())
      .post("/users/role-assignments")
      .set("Cookie", cookie)
      .send({ userId: targetUserId, role: "gerente", venueId: null });

    expect(res.status).toBe(400);
  });

  it("denies a non-admin from creating a role assignment", async () => {
    const { tenantId, venueId } = await seedTenantWithVenue("Zoo Users Create Denied");
    const { cookie } = await seedStaff(tenantId, "vendedor", venueId);
    const { userId: targetUserId } = await seedStaff(tenantId, "validador", venueId);

    const res = await request(createApp())
      .post("/users/role-assignments")
      .set("Cookie", cookie)
      .send({ userId: targetUserId, role: "gerente", venueId });

    expect(res.status).toBe(403);
  });

  it("revokes a role assignment and it takes effect on the very next request (spec: Revoked assignment is denied on the next request)", async () => {
    const { tenantId, venueId } = await seedTenantWithVenue("Zoo Users Revoke");
    const { cookie: adminCookie } = await seedStaff(tenantId, "admin");
    const { cookie: validadorCookie } = await seedStaff(tenantId, "validador", venueId);

    const scanBefore = await request(createApp())
      .post("/access/scan")
      .set("Cookie", validadorCookie)
      .send({ code: "does-not-exist", venueId });
    expect(scanBefore.status).not.toBe(403);

    const listRes = await request(createApp()).get("/users").set("Cookie", adminCookie);
    const validadorAssignmentId = (
      listRes.body.users as Array<{ assignments: Array<{ id: string; role: string }> }>
    )
      .flatMap((u) => u.assignments)
      .find((a) => a.role === "validador")?.id;
    expect(validadorAssignmentId).toBeDefined();

    const revokeRes = await request(createApp())
      .delete(`/users/role-assignments/${validadorAssignmentId}`)
      .set("Cookie", adminCookie);
    expect(revokeRes.status).toBe(204);

    const scanAfter = await request(createApp())
      .post("/access/scan")
      .set("Cookie", validadorCookie)
      .send({ code: "does-not-exist", venueId });
    expect(scanAfter.status).toBe(403);
  });

  it("returns 404 revoking an assignment that doesn't exist for this tenant", async () => {
    const { tenantId } = await seedTenantWithVenue("Zoo Users Revoke 404");
    const { cookie } = await seedStaff(tenantId, "admin");

    const res = await request(createApp())
      .delete(`/users/role-assignments/${randomUUID()}`)
      .set("Cookie", cookie);
    expect(res.status).toBe(404);
  });
});

/**
 * spec: foundation/user-management - "Admin creates a new user together
 * with their first role assignment" (openspec change
 * add-venue-scoped-user-roles, design.md D7).
 */
describe.skipIf(!dbReachable)("POST /users (live Postgres)", () => {
  it("creates a user with a Venue-scoped role and that user can immediately log in with it", async () => {
    const { tenantId, venueId } = await seedTenantWithVenue("Zoo Create User");
    const { cookie: adminCookie } = await seedStaff(tenantId, "admin");

    const createRes = await request(createApp())
      .post("/users")
      .set("Cookie", adminCookie)
      .send({ email: "novo-vendedor@example.com", password: "senha-forte-123", role: "vendedor", venueId });
    expect(createRes.status).toBe(201);
    expect(createRes.body.userId).toBeDefined();

    const loginRes = await request(createApp())
      .post("/auth/login")
      .send({ tenantId, email: "novo-vendedor@example.com", password: "senha-forte-123" });
    expect(loginRes.status).toBe(200);

    const cookie = loginRes.headers["set-cookie"];
    expect(cookie).toBeDefined();
    const meRes = await request(createApp()).get("/auth/me").set("Cookie", cookie!);
    expect(meRes.status).toBe(200);
    expect(meRes.body.roles).toEqual(["vendedor"]);
    expect(meRes.body.venueIds).toEqual([venueId]);
  });

  it("creates a user with the Admin role and no Venue", async () => {
    const { tenantId } = await seedTenantWithVenue("Zoo Create Admin User");
    const { cookie } = await seedStaff(tenantId, "admin");

    const res = await request(createApp())
      .post("/users")
      .set("Cookie", cookie)
      .send({ email: "novo-admin@example.com", password: "senha-forte-123", role: "admin", venueId: null });

    expect(res.status).toBe(201);
  });

  it("rejects a duplicate email within the same Organization", async () => {
    const { tenantId, venueId } = await seedTenantWithVenue("Zoo Create User Duplicado");
    const { cookie } = await seedStaff(tenantId, "admin");

    await request(createApp())
      .post("/users")
      .set("Cookie", cookie)
      .send({ email: "duplicado@example.com", password: "senha-forte-123", role: "vendedor", venueId });

    const res = await request(createApp())
      .post("/users")
      .set("Cookie", cookie)
      .send({ email: "duplicado@example.com", password: "outra-senha", role: "validador", venueId });

    expect(res.status).toBe(409);
  });

  it("denies a non-admin from creating a user", async () => {
    const { tenantId, venueId } = await seedTenantWithVenue("Zoo Create User Denied");
    const { cookie } = await seedStaff(tenantId, "vendedor", venueId);

    const res = await request(createApp())
      .post("/users")
      .set("Cookie", cookie)
      .send({ email: "outro@example.com", password: "senha-forte-123", role: "vendedor", venueId });

    expect(res.status).toBe(403);
  });
});
