import type { OrganizationConfiguration } from "../domain/organization-configuration.entity.js";
import type { OrganizationConfigurationRepositoryPort } from "../domain/ports.js";

export class GetConfigurationUseCase {
  constructor(private readonly configurations: OrganizationConfigurationRepositoryPort) {}

  async execute(tenantId: string, key: string): Promise<OrganizationConfiguration | null> {
    return this.configurations.get(tenantId, key);
  }
}
