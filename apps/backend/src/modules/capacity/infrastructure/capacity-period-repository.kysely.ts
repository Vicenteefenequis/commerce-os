import type { Trx } from "../../../http/tx-route.js";
import type { CapacityPeriodRepositoryPort } from "../domain/ports.js";

export class ResourceNotFoundError extends Error {
  constructor() {
    super("resource not found");
  }
}

export class KyselyCapacityPeriodRepository implements CapacityPeriodRepositoryPort {
  constructor(private readonly trx: Trx) {}

  async getConfiguredCapacity(tenantId: string, resourceId: string, period: string): Promise<number> {
    const override = await this.trx
      .selectFrom("resource_capacity_periods")
      .select("capacity")
      .where("tenant_id", "=", tenantId)
      .where("resource_id", "=", resourceId)
      .where("period", "=", period)
      .executeTakeFirst();
    if (override) return override.capacity;

    const resource = await this.trx
      .selectFrom("resources")
      .select("default_capacity")
      .where("tenant_id", "=", tenantId)
      .where("id", "=", resourceId)
      .executeTakeFirst();
    if (!resource) throw new ResourceNotFoundError();
    return resource.default_capacity;
  }

  async setPeriodCapacity(
    tenantId: string,
    resourceId: string,
    period: string,
    capacity: number,
  ): Promise<void> {
    await this.trx
      .insertInto("resource_capacity_periods")
      .values({ tenant_id: tenantId, resource_id: resourceId, period, capacity })
      .onConflict((oc) =>
        oc.columns(["resource_id", "period"]).doUpdateSet({ capacity, updated_at: new Date() }),
      )
      .execute();
  }

  async getCommittedAmount(tenantId: string, resourceId: string, period: string): Promise<number> {
    const row = await this.trx
      .selectFrom("resource_capacity_commitments")
      .select((eb) => eb.fn.coalesce(eb.fn.sum<number>("amount"), eb.lit(0)).as("total"))
      .where("tenant_id", "=", tenantId)
      .where("resource_id", "=", resourceId)
      .where("period", "=", period)
      .where("status", "in", ["held", "consumed"])
      .executeTakeFirstOrThrow();
    return Number(row.total);
  }
}
