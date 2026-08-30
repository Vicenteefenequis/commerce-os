import { PermissionCheckUseCase } from "../../authorization/application/permission-check.usecase.js";
import type { Role } from "../../authorization/domain/role.js";
import type { EventPublisherPort } from "../../../shared-kernel/ports.js";
import { OrganizationConfiguration } from "../domain/organization-configuration.entity.js";
import { configurationChangedEvent } from "../domain/events.js";
import type { OrganizationConfigurationRepositoryPort } from "../domain/ports.js";

export class ConfigurationPermissionDeniedError extends Error {
  constructor() {
    super("permission denied");
  }
}

export interface SetConfigurationInput {
  tenantId: string;
  key: string;
  value: string;
  actingRoles: Role[];
  actorUserId: string;
}

/**
 * spec: foundation/configuration - "Configuration changes require
 * authorization". Enforces the authorization port directly (task 8.2),
 * in addition to the HTTP-level requirePermission middleware, so this
 * use-case is safe to reuse from non-HTTP entry points later.
 */
export class SetConfigurationUseCase {
  private readonly permissionCheck = new PermissionCheckUseCase();

  constructor(
    private readonly configurations: OrganizationConfigurationRepositoryPort,
    private readonly eventPublisher: EventPublisherPort,
  ) {}

  async execute(input: SetConfigurationInput): Promise<OrganizationConfiguration> {
    const allowed = this.permissionCheck.execute({
      actingTenantId: input.tenantId,
      roles: input.actingRoles,
      permission: "configuration:manage",
    });
    if (!allowed) {
      throw new ConfigurationPermissionDeniedError();
    }

    const config = OrganizationConfiguration.create({
      tenantId: input.tenantId,
      key: input.key,
      value: input.value,
    });

    const persisted = await this.configurations.set({
      tenantId: config.tenantId,
      key: config.key,
      value: config.value,
    });

    await this.eventPublisher.publish([
      configurationChangedEvent(input.tenantId, {
        key: persisted.key,
        value: persisted.value,
        actorUserId: input.actorUserId,
      }),
    ]);

    return persisted;
  }
}
