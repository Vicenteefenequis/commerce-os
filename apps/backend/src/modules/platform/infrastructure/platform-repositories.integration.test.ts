import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { sql } from "kysely";
import { db } from "../../../db/kysely.js";
import { KyselyPlatformAdminRepository } from "./platform-admin-repository.kysely.js";
import {
  KyselyPlatformSessionRepository,
  findPlatformSessionByIdUnscoped,
} from "./platform-session-repository.kysely.js";

/**
 * spec: foundation/platform-admin. Requires a reachable Postgres, same
 * skip-if-unreachable convention as order-fulfillment.integration.test.ts.
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

async function seedPlatformAdmin() {
  const id = randomUUID();
  const email = `admin-${id}@example.com`;
  await db
    .insertInto("platform_admins")
    .values({ id, email, password_hash: "hash" })
    .execute();
  return { id, email };
}

describe.skipIf(!dbReachable)("Platform repositories (live Postgres)", () => {
  it("finds a platform admin by email and by id", async () => {
    const { id, email } = await seedPlatformAdmin();

    await db.transaction().execute(async (trx) => {
      const repo = new KyselyPlatformAdminRepository(trx);
      const byEmail = await repo.findByEmail(email);
      const byId = await repo.findById(id);

      expect(byEmail?.id).toBe(id);
      expect(byId?.email).toBe(email);
    });
  });

  it("returns null for an unknown email", async () => {
    await db.transaction().execute(async (trx) => {
      const repo = new KyselyPlatformAdminRepository(trx);
      expect(await repo.findByEmail(`nobody-${randomUUID()}@example.com`)).toBeNull();
    });
  });

  it("creates, finds unscoped, and revokes a platform session", async () => {
    const { id: adminId } = await seedPlatformAdmin();

    const sessionId = await db.transaction().execute(async (trx) => {
      const repo = new KyselyPlatformSessionRepository(trx);
      const session = await repo.create({ adminId, expiresAt: new Date(Date.now() + 60_000) });
      return session.id;
    });

    const foundUnscoped = await findPlatformSessionByIdUnscoped(db, sessionId);
    expect(foundUnscoped?.adminId).toBe(adminId);
    expect(foundUnscoped?.isValid(new Date())).toBe(true);

    await db.transaction().execute(async (trx) => {
      await new KyselyPlatformSessionRepository(trx).revoke(sessionId);
    });

    const afterRevoke = await findPlatformSessionByIdUnscoped(db, sessionId);
    expect(afterRevoke?.isValid(new Date())).toBe(false);
  });
});
