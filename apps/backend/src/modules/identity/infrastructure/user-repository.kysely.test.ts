import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { sql } from "kysely";
import { db } from "../../../db/kysely.js";
import { KyselyUserRepository } from "./user-repository.kysely.js";

/**
 * spec: foundation/platform-admin - "Register a tenant as platform admin"
 * relies on UserRepositoryPort.create, added alongside the platform-admin
 * console. Requires a reachable Postgres, same skip-if-unreachable
 * convention as platform-repositories.integration.test.ts.
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

describe.skipIf(!dbReachable)("KyselyUserRepository.create (live Postgres)", () => {
  it("creates a user under a tenant and it can then be found by tenant + email", async () => {
    const tenantId = randomUUID();
    await db.insertInto("organizations").values({ id: tenantId, name: "Zoo", slug: tenantId }).execute();
    await sql`select set_config('app.tenant_id', ${tenantId}, false)`.execute(db);

    await db.transaction().execute(async (trx) => {
      const repo = new KyselyUserRepository(trx);
      const email = `owner-${randomUUID()}@example.com`;

      const created = await repo.create({ tenantId, email, passwordHash: "hash" });
      expect(created.tenantId).toBe(tenantId);
      expect(created.email).toBe(email);

      const found = await repo.findByTenantAndEmail(tenantId, email);
      expect(found?.id).toBe(created.id);
    });
  });
});
