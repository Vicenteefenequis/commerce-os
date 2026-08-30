import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import {
  ConfigurationPermissionDeniedError,
  SetConfigurationUseCase,
} from "./set-configuration.usecase.js";
import { OrganizationConfiguration } from "../domain/organization-configuration.entity.js";
import type { OrganizationConfigurationRepositoryPort } from "../domain/ports.js";
import type { DomainEvent } from "../../../events/domain-event.js";
import type { EventPublisherPort } from "../../../shared-kernel/ports.js";
import { CONFIGURATION_CHANGED } from "../domain/events.js";

class FakeConfigurationRepository implements OrganizationConfigurationRepositoryPort {
  private store = new Map<string, OrganizationConfiguration>();
  async get(tenantId: string, key: string) {
    return this.store.get(`${tenantId}:${key}`) ?? null;
  }
  async set(config: { tenantId: string; key: string; value: string }) {
    const created = OrganizationConfiguration.create(config);
    this.store.set(`${config.tenantId}:${config.key}`, created);
    return created;
  }
}

class FakeEventPublisher implements EventPublisherPort {
  public published: DomainEvent[] = [];
  async publish(events: DomainEvent[]): Promise<void> {
    this.published.push(...events);
  }
}

describe("SetConfigurationUseCase", () => {
  const tenantId = randomUUID();

  it("sets a value and emits configuration.changed when the actor is authorized", async () => {
    const repo = new FakeConfigurationRepository();
    const publisher = new FakeEventPublisher();
    const useCase = new SetConfigurationUseCase(repo, publisher);

    const config = await useCase.execute({
      tenantId,
      key: "checkout.enabled",
      value: "true",
      actingRoles: ["owner"],
      actorUserId: randomUUID(),
    });

    expect(config.value).toBe("true");
    expect(publisher.published[0]?.type).toBe(CONFIGURATION_CHANGED);
  });

  it("denies the change for a role without configuration:manage", async () => {
    const repo = new FakeConfigurationRepository();
    const publisher = new FakeEventPublisher();
    const useCase = new SetConfigurationUseCase(repo, publisher);

    await expect(
      useCase.execute({
        tenantId,
        key: "checkout.enabled",
        value: "true",
        actingRoles: ["sales"],
        actorUserId: randomUUID(),
      }),
    ).rejects.toBeInstanceOf(ConfigurationPermissionDeniedError);
    expect(publisher.published).toHaveLength(0);
  });
});
