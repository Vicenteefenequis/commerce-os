import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { sql } from "kysely";
import { db } from "../../../db/kysely.js";
import { KyselyRoleAssignmentRepository } from "./role-assignment-repository.kysely.js";

/**
 * spec: foundation/platform-admin - "Register a tenant as platform admin"
 * relies on RoleAssignmentRepositoryPort.create, added alongside the
 * platform-admin console. Requires a reachable Postgres, same
 * skip-if-unreachable convention as platform-repositories.integration.test.ts.
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

describe.skipIf(!dbReachable)("KyselyRoleAssignmentRepository.create (live Postgres)", () => {
  it("creates an org-wide admin assignment and it is then returned for that user", async () => {
    const tenantId = randomUUID();
    const userId = randomUUID();
    await db.insertInto("organizations").values({ id: tenantId, name: "Zoo", slug: tenantId }).execute();
    await sql`select set_config('app.tenant_id', ${tenantId}, false)`.execute(db);
    await db
      .insertInto("users")
      .values({ id: userId, tenant_id: tenantId, email: `u-${userId}@example.com`, password_hash: "hash" })
      .execute();

    await db.transaction().execute(async (trx) => {
      const repo = new KyselyRoleAssignmentRepository(trx);
      await repo.create({ tenantId, userId, role: "admin", venueId: null });

      const roles = await repo.findRolesForUser(tenantId, userId);
      expect(roles).toEqual(["admin"]);

      const assignments = await repo.findAssignmentsForUser(tenantId, userId);
      expect(assignments).toEqual([{ role: "admin", venueId: null }]);
    });
  });

  it("creates a Venue-scoped assignment and can hold more than one role for the same user", async () => {
    const tenantId = randomUUID();
    const userId = randomUUID();
    const venueId = randomUUID();
    await db.insertInto("organizations").values({ id: tenantId, name: "Zoo", slug: tenantId }).execute();
    await sql`select set_config('app.tenant_id', ${tenantId}, false)`.execute(db);
    await db.insertInto("venues").values({ id: venueId, tenant_id: tenantId, name: "Unidade", slug: venueId }).execute();
    await db
      .insertInto("users")
      .values({ id: userId, tenant_id: tenantId, email: `u-${userId}@example.com`, password_hash: "hash" })
      .execute();

    await db.transaction().execute(async (trx) => {
      const repo = new KyselyRoleAssignmentRepository(trx);
      await repo.create({ tenantId, userId, role: "vendedor", venueId });
      await repo.create({ tenantId, userId, role: "validador", venueId });

      const assignments = await repo.findAssignmentsForUser(tenantId, userId);
      expect(assignments).toEqual(
        expect.arrayContaining([
          { role: "vendedor", venueId },
          { role: "validador", venueId },
        ]),
      );
      expect(assignments).toHaveLength(2);
    });
  });
});
