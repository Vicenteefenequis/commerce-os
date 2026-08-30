import type { Trx } from "../../../http/tx-route.js";
import { OrganizationConfiguration } from "../domain/organization-configuration.entity.js";
import type { OrganizationConfigurationRepositoryPort } from "../domain/ports.js";

export class KyselyOrganizationConfigurationRepository
  implements OrganizationConfigurationRepositoryPort
{
  constructor(private readonly trx: Trx) {}

  async get(tenantId: string, key: string): Promise<OrganizationConfiguration | null> {
    const row = await this.trx
      .selectFrom("organization_configuration")
      .selectAll()
      .where("tenant_id", "=", tenantId)
      .where("key", "=", key)
      .executeTakeFirst();
    return row
      ? OrganizationConfiguration.create({ tenantId: row.tenant_id, key: row.key, value: row.value })
      : null;
  }

  async set(config: {
    tenantId: string;
    key: string;
    value: string;
  }): Promise<OrganizationConfiguration> {
    const row = await this.trx
      .insertInto("organization_configuration")
      .values({ tenant_id: config.tenantId, key: config.key, value: config.value })
      .onConflict((oc) =>
        oc.columns(["tenant_id", "key"]).doUpdateSet({ value: config.value, updated_at: new Date() }),
      )
      .returningAll()
      .executeTakeFirstOrThrow();
    return OrganizationConfiguration.create({
      tenantId: row.tenant_id,
      key: row.key,
      value: row.value,
    });
  }
}
