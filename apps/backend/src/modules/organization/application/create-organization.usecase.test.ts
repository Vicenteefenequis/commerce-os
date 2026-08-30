import { describe, expect, it } from "vitest";
import { CreateOrganizationUseCase } from "./create-organization.usecase.js";
import { Organization, InvalidOrganizationError } from "../domain/organization.entity.js";
import type { OrganizationRepositoryPort } from "../domain/ports.js";
import type { DomainEvent } from "../../../events/domain-event.js";
import type { EventPublisherPort } from "../../../shared-kernel/ports.js";
import { ORGANIZATION_CREATED } from "../domain/events.js";

class FakeOrganizationRepository implements OrganizationRepositoryPort {
  public created: Organization | null = null;
  async create(organization: { id: string; name: string }): Promise<Organization> {
    this.created = Organization.create(organization);
    return this.created;
  }
  async findById(id: string): Promise<Organization | null> {
    return this.created && this.created.id === id ? this.created : null;
  }
}

class FakeEventPublisher implements EventPublisherPort {
  public published: DomainEvent[] = [];
  async publish(events: DomainEvent[]): Promise<void> {
    this.published.push(...events);
  }
}

describe("CreateOrganizationUseCase", () => {
  it("creates an organization and emits organization.created", async () => {
    const repo = new FakeOrganizationRepository();
    const publisher = new FakeEventPublisher();
    const useCase = new CreateOrganizationUseCase(repo, publisher);

    const organization = await useCase.execute({ name: "Zoo Municipal" });

    expect(organization.name).toBe("Zoo Municipal");
    expect(publisher.published).toHaveLength(1);
    expect(publisher.published[0]?.type).toBe(ORGANIZATION_CREATED);
    expect(publisher.published[0]?.tenantId).toBe(organization.id);
  });

  it("rejects an empty name without persisting or publishing", async () => {
    const repo = new FakeOrganizationRepository();
    const publisher = new FakeEventPublisher();
    const useCase = new CreateOrganizationUseCase(repo, publisher);

    await expect(useCase.execute({ name: "" })).rejects.toBeInstanceOf(InvalidOrganizationError);
    expect(repo.created).toBeNull();
    expect(publisher.published).toHaveLength(0);
  });
});
