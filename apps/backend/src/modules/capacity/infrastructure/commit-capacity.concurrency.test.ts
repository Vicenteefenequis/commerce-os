import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { sql } from "kysely";
import { db } from "../../../db/kysely.js";
import { CapacityExceededError, CommitCapacityUseCase } from "../application/commit-capacity.usecase.js";
import { KyselyResourceRepository } from "./resource-repository.kysely.js";
import { KyselyCapacityCommitmentRepository } from "./capacity-commitment-repository.kysely.js";

/**
 * spec: capacity/resource - "Concurrent commitments do not exceed hard
 * capacity" - this scenario is a genuine concurrency property that can
 * only be proven against a real Postgres instance (design.md D3: a
 * transaction-scoped advisory lock serializes concurrent commit
 * attempts). Requires DATABASE_URL / a running Postgres (see
 * docker-compose.yml); skips itself when the database is unreachable so
 * `pnpm test` stays green without Docker, consistent with this codebase
 * having no other automated Postgres-backed test harness (see tasks.md
 * 3.1/5.1).
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

describe.skipIf(!dbReachable)("CommitCapacityUseCase concurrency (live Postgres)", () => {
  it("allows exactly one of two concurrent commitments that together exceed remaining hard capacity", async () => {
    const tenantId = randomUUID();
    const venueId = randomUUID();
    const resourceId = randomUUID();
    const period = "2026-06-15";

    await db
      .insertInto("organizations")
      .values({ id: tenantId, name: "Zoo Concorrência", slug: tenantId })
      .execute();

    await sql`select set_config('app.tenant_id', ${tenantId}, false)`.execute(db);

    await db
      .insertInto("venues")
      .values({ id: venueId, tenant_id: tenantId, name: "Unidade Teste", slug: venueId })
      .execute();

    // Capacity for 60; two commitments of 40 each are attempted concurrently -
    // only one can fit.
    await db
      .insertInto("resources")
      .values({
        id: resourceId,
        tenant_id: tenantId,
        venue_id: venueId,
        name: "Portão",
        default_capacity: 60,
        hard_capacity: true,
      })
      .execute();

    async function attemptCommit(amount: number) {
      return db.transaction().execute(async (trx) => {
        await sql`select set_config('app.tenant_id', ${tenantId}, true)`.execute(trx);
        const useCase = new CommitCapacityUseCase(
          new KyselyResourceRepository(trx),
          new KyselyCapacityCommitmentRepository(trx),
        );
        try {
          return await useCase.execute({ tenantId, resourceId, period, amount });
        } catch (err) {
          if (err instanceof CapacityExceededError) return "rejected" as const;
          throw err;
        }
      });
    }

    const [a, b] = await Promise.all([attemptCommit(40), attemptCommit(40)]);
    const results = [a, b];

    const accepted = results.filter((r) => r !== "rejected");
    const rejected = results.filter((r) => r === "rejected");

    expect(accepted).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    await sql`select set_config('app.tenant_id', ${tenantId}, false)`.execute(db);
    const committedRows = await db
      .selectFrom("resource_capacity_commitments")
      .selectAll()
      .where("resource_id", "=", resourceId)
      .where("period", "=", period)
      .execute();
    expect(committedRows).toHaveLength(1);
    expect(committedRows[0]?.amount).toBe(40);
  });

  it("rejects a commitment that alone exceeds hard capacity", async () => {
    const tenantId = randomUUID();
    const venueId = randomUUID();
    const resourceId = randomUUID();
    const period = "2026-07-01";

    await sql`select set_config('app.tenant_id', ${tenantId}, false)`.execute(db);
    await db.insertInto("organizations").values({ id: tenantId, name: "Zoo Solo", slug: tenantId }).execute();
    await sql`select set_config('app.tenant_id', ${tenantId}, false)`.execute(db);
    await db.insertInto("venues").values({ id: venueId, tenant_id: tenantId, name: "Unidade", slug: venueId }).execute();
    await db
      .insertInto("resources")
      .values({ id: resourceId, tenant_id: tenantId, venue_id: venueId, name: "Portão", default_capacity: 10, hard_capacity: true })
      .execute();

    await db.transaction().execute(async (trx) => {
      await sql`select set_config('app.tenant_id', ${tenantId}, true)`.execute(trx);
      const useCase = new CommitCapacityUseCase(
        new KyselyResourceRepository(trx),
        new KyselyCapacityCommitmentRepository(trx),
      );
      await expect(useCase.execute({ tenantId, resourceId, period, amount: 11 })).rejects.toBeInstanceOf(
        CapacityExceededError,
      );
    });
  });
});
