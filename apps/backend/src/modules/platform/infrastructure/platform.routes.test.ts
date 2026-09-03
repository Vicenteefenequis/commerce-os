import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { sql } from "kysely";
import request from "supertest";
import * as argon2 from "argon2";
import { createApp } from "../../../http/app.js";
import { db } from "../../../db/kysely.js";
import { sessionCookieHeader } from "../../identity/infrastructure/cookie.js";
import { platformSessionCookieHeader } from "./cookie.js";

/**
 * spec: foundation/platform-admin; foundation/organization (creation now
 * requires an authenticated platform admin). Requires a reachable
 * Postgres, same skip-if-unreachable convention as dashboard.routes.test.ts.
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

async function seedPlatformAdmin(password: string) {
  const id = randomUUID();
  const email = `admin-${id}@example.com`;
  await db
    .insertInto("platform_admins")
    .values({ id, email, password_hash: await argon2.hash(password) })
    .execute();
  return { id, email };
}

async function seedPlatformSessionCookie(adminId: string) {
  const session = await db
    .insertInto("platform_sessions")
    .values({ id: randomUUID(), admin_id: adminId, expires_at: new Date(Date.now() + 900_000) })
    .returningAll()
    .executeTakeFirstOrThrow();
  return platformSessionCookieHeader(session.id);
}

describe.skipIf(!dbReachable)("Platform admin console (live Postgres)", () => {
  it("logs a platform admin in and sets the platform cookie", async () => {
    const { email } = await seedPlatformAdmin("secret123");
    const app = createApp();

    const res = await request(app).post("/platform/login").send({ email, password: "secret123" });

    expect(res.status).toBe(200);
    const setCookie = res.headers["set-cookie"];
    expect(setCookie?.[0]).toContain("cos_platform_session=");
  });

  it("rejects invalid platform credentials", async () => {
    const { email } = await seedPlatformAdmin("secret123");
    const app = createApp();

    const res = await request(app).post("/platform/login").send({ email, password: "wrong" });
    expect(res.status).toBe(401);
  });

  it("rejects listing/creating organizations without a platform session", async () => {
    const app = createApp();

    const list = await request(app).get("/platform/organizations");
    expect(list.status).toBe(401);

    const create = await request(app).post("/platform/organizations").send({ name: "Zoo" });
    expect(create.status).toBe(401);
  });

  it("lists every organization and creates one with its first owner", async () => {
    const { id: adminId } = await seedPlatformAdmin("secret123");
    const cookie = await seedPlatformSessionCookie(adminId);
    const app = createApp();

    const existingId = randomUUID();
    await db
      .insertInto("organizations")
      .values({ id: existingId, name: "Zoo Existente", slug: `zoo-existente-${existingId.slice(0, 8)}` })
      .execute();

    const list = await request(app).get("/platform/organizations").set("Cookie", cookie);
    expect(list.status).toBe(200);
    expect(list.body.organizations.some((o: { id: string }) => o.id === existingId)).toBe(true);

    const slug = `novo-tenant-${randomUUID().slice(0, 8)}`;
    const ownerEmail = `owner-${randomUUID()}@example.com`;
    const create = await request(app)
      .post("/platform/organizations")
      .set("Cookie", cookie)
      .send({ name: "Novo Tenant", slug, email: ownerEmail, password: "owner-secret" });

    expect(create.status).toBe(201);
    expect(create.body.slug).toBe(slug);
    expect(create.body.owner.email).toBe(ownerEmail);

    const listAfter = await request(app).get("/platform/organizations").set("Cookie", cookie);
    expect(listAfter.body.organizations.some((o: { slug: string }) => o.slug === slug)).toBe(true);

    const login = await request(app)
      .post("/auth/login")
      .send({ tenantId: create.body.id, email: ownerEmail, password: "owner-secret" });
    expect(login.status).toBe(200);
  });

  it("rejects creating an organization with a slug that already exists", async () => {
    const { id: adminId } = await seedPlatformAdmin("secret123");
    const cookie = await seedPlatformSessionCookie(adminId);
    const app = createApp();

    const slug = `dup-tenant-${randomUUID().slice(0, 8)}`;
    await db.insertInto("organizations").values({ id: randomUUID(), name: "Original", slug }).execute();

    const res = await request(app)
      .post("/platform/organizations")
      .set("Cookie", cookie)
      .send({ name: "Duplicado", slug, email: `dup-${randomUUID()}@example.com`, password: "secret" });

    expect(res.status).toBe(409);
  });

  it("rejects creating a tenant without an owner email/password", async () => {
    const { id: adminId } = await seedPlatformAdmin("secret123");
    const cookie = await seedPlatformSessionCookie(adminId);
    const app = createApp();

    const res = await request(app)
      .post("/platform/organizations")
      .set("Cookie", cookie)
      .send({ name: "Sem Dono", slug: `sem-dono-${randomUUID().slice(0, 8)}` });

    expect(res.status).toBe(400);
  });

  it("creates no Organization when the owner cannot be created", async () => {
    const { id: adminId } = await seedPlatformAdmin("secret123");
    const cookie = await seedPlatformSessionCookie(adminId);
    const app = createApp();

    const slug = `rollback-tenant-${randomUUID().slice(0, 8)}`;
    const res = await request(app)
      .post("/platform/organizations")
      .set("Cookie", cookie)
      .send({ name: "Rollback Tenant", slug, email: "not-an-email", password: "secret" });

    expect(res.status).toBe(400);

    const orgs = await db.selectFrom("organizations").selectAll().where("slug", "=", slug).execute();
    expect(orgs).toHaveLength(0);
  });

  it("keeps a platform session and a tenant session independent", async () => {
    const { id: adminId } = await seedPlatformAdmin("secret123");
    const platformCookie = await seedPlatformSessionCookie(adminId);

    const tenantId = randomUUID();
    await db.insertInto("organizations").values({ id: tenantId, name: "Zoo Tenant", slug: tenantId }).execute();
    await sql`select set_config('app.tenant_id', ${tenantId}, false)`.execute(db);
    const userId = randomUUID();
    await db
      .insertInto("users")
      .values({ id: userId, tenant_id: tenantId, email: `staff-${userId}@example.com`, password_hash: "x" })
      .execute();
    const tenantSession = await db
      .insertInto("sessions")
      .values({ id: randomUUID(), tenant_id: tenantId, user_id: userId, expires_at: new Date(Date.now() + 900_000) })
      .returningAll()
      .executeTakeFirstOrThrow();
    const tenantCookie = sessionCookieHeader(tenantSession.id);

    const app = createApp();
    const both = `${platformCookie.split(";")[0]}; ${tenantCookie.split(";")[0]}`;

    const meRes = await request(app).get("/auth/me").set("Cookie", both);
    expect(meRes.status).toBe(200);
    expect(meRes.body.tenantId).toBe(tenantId);

    const orgsRes = await request(app).get("/platform/organizations").set("Cookie", both);
    expect(orgsRes.status).toBe(200);
  });
});
