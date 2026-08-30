import { randomUUID } from "node:crypto";
import { sql } from "kysely";
import type { Trx } from "../../../http/tx-route.js";
import type { CapacityCommitmentRepositoryPort } from "../domain/ports.js";
import { KyselyCapacityPeriodRepository } from "./capacity-period-repository.kysely.js";

export class KyselyCapacityCommitmentRepository implements CapacityCommitmentRepositoryPort {
  constructor(private readonly trx: Trx) {}

  /**
   * design.md D3: serializes concurrent commit attempts against the same
   * resource+period. A Postgres transaction-scoped advisory lock is used
   * instead of `SELECT ... FOR UPDATE` on the period row, because a
   * period may have no override row at all (capacity falls back to the
   * resource default) - locking a row that might not exist doesn't work,
   * and materializing a row just to lock it would silently turn "uses
   * the default" into a stale explicit override. The lock key is a hash
   * of tenant+resource+period; it is released automatically at
   * transaction end (commit or rollback).
   */
  async tryCommit(input: {
    tenantId: string;
    resourceId: string;
    period: string;
    amount: number;
    hardCapacity: boolean;
  }): Promise<{ id: string } | null> {
    const lockKey = `${input.tenantId}:${input.resourceId}:${input.period}`;
    await sql`select pg_advisory_xact_lock(hashtext(${lockKey}))`.execute(this.trx);

    if (input.hardCapacity) {
      const periods = new KyselyCapacityPeriodRepository(this.trx);
      const [configured, committed] = await Promise.all([
        periods.getConfiguredCapacity(input.tenantId, input.resourceId, input.period),
        periods.getCommittedAmount(input.tenantId, input.resourceId, input.period),
      ]);
      const available = Math.max(0, configured - committed);
      if (input.amount > available) {
        return null;
      }
    }

    const id = randomUUID();
    await this.trx
      .insertInto("resource_capacity_commitments")
      .values({
        id,
        tenant_id: input.tenantId,
        resource_id: input.resourceId,
        period: input.period,
        amount: input.amount,
        status: "held",
      })
      .execute();

    return { id };
  }
}
