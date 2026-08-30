import type { OrganizationConfiguration } from "./organization-configuration.entity.js";

export interface OrganizationConfigurationRepositoryPort {
  get(tenantId: string, key: string): Promise<OrganizationConfiguration | null>;
  set(config: { tenantId: string; key: string; value: string }): Promise<OrganizationConfiguration>;
}
