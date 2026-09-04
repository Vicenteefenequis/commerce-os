import { describe, expect, it } from "vitest";
import {
  CreateOrganizationUseCase,
  InvalidSlugError,
  SlugAlreadyExistsError,
} from "./create-organization.usecase.js";
import { Organization, InvalidOrganizationError } from "../domain/organization.entity.js";
import type { OrganizationRepositoryPort } from "../domain/ports.js";
import type { DomainEvent } from "../../../events/domain-event.js";
import type { EventPublisherPort } from "../../../shared-kernel/ports.js";
import { ORGANIZATION_CREATED } from "../domain/events.js";

class FakeOrganizationRepository implements OrganizationRepositoryPort {
  public created: Organization | null = null;
  public bySlug = new Map<string, Organization>();

  async create(organization: { id: string; name: string; slug: string }): Promise<Organization> {
    this.created = Organization.create(organization);
    this.bySlug.set(organization.slug, this.created);
    return this.created;
  }
  async findById(id: string): Promise<Organization | null> {
    return this.created && this.created.id === id ? this.created : null;
  }
  async findBySlug(slug: string): Promise<Organization | null> {
    return this.bySlug.get(slug) ?? null;
  }
  async listAll(): Promise<Organization[]> {
    throw new Error("not used in this test");
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

  it("generates a slug from the name when none is supplied", async () => {
    const repo = new FakeOrganizationRepository();
    const useCase = new CreateOrganizationUseCase(repo, new FakeEventPublisher());

    const organization = await useCase.execute({ name: "Zoológico X" });

    expect(organization.slug).toBe("zoologico-x");
  });

  it("uses a supplied slug over the generated one", async () => {
    const repo = new FakeOrganizationRepository();
    const useCase = new CreateOrganizationUseCase(repo, new FakeEventPublisher());

    const organization = await useCase.execute({ name: "Zoológico X", slug: "zoo-x" });

    expect(organization.slug).toBe("zoo-x");
  });

  it("rejects a malformed slug", async () => {
    const repo = new FakeOrganizationRepository();
    const useCase = new CreateOrganizationUseCase(repo, new FakeEventPublisher());

    await expect(useCase.execute({ name: "Zoo", slug: "Not Valid!" })).rejects.toBeInstanceOf(
      InvalidSlugError,
    );
  });

  it("rejects a duplicate slug without persisting or publishing", async () => {
    const repo = new FakeOrganizationRepository();
    const publisher = new FakeEventPublisher();
    const useCase = new CreateOrganizationUseCase(repo, publisher);
    await useCase.execute({ name: "Zoo Municipal", slug: "zoo-municipal" });

    await expect(useCase.execute({ name: "Outro Zoo", slug: "zoo-municipal" })).rejects.toBeInstanceOf(
      SlugAlreadyExistsError,
    );
    expect(publisher.published).toHaveLength(1);
  });
});
