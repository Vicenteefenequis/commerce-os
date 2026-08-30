import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { CreateResourceUseCase, ParentVenueNotFoundError } from "./create-resource.usecase.js";
import { Resource } from "../domain/resource.entity.js";
import { InvalidResourceError } from "../domain/resource.entity.js";
import type { CreateResourceInput, ResourceRepositoryPort } from "../domain/ports.js";
import { Venue } from "../../venue/domain/venue.entity.js";
import type { VenueRepositoryPort } from "../../venue/domain/ports.js";
import type { DomainEvent } from "../../../events/domain-event.js";
import type { EventPublisherPort } from "../../../shared-kernel/ports.js";
import { RESOURCE_CREATED } from "../domain/events.js";

class FakeVenueRepository implements VenueRepositoryPort {
  constructor(private readonly venues: Venue[]) {}
  async create(): Promise<Venue> {
    throw new Error("not used in this test");
  }
  async listByTenant(tenantId: string): Promise<Venue[]> {
    return this.venues.filter((v) => v.tenantId === tenantId);
  }
}

class FakeResourceRepository implements ResourceRepositoryPort {
  public created: Resource[] = [];
  async create(input: CreateResourceInput): Promise<Resource> {
    const resource = Resource.create({
      id: input.id,
      tenantId: input.tenantId,
      venueId: input.venueId,
      name: input.name,
      defaultCapacity: input.defaultCapacity,
      hardCapacity: input.hardCapacity ?? false,
    });
    this.created.push(resource);
    return resource;
  }
  async findById(): Promise<Resource | null> {
    throw new Error("not used in this test");
  }
  async listByVenue(): Promise<Resource[]> {
    throw new Error("not used in this test");
  }
  async setDefaultCapacity(): Promise<void> {
    throw new Error("not used in this test");
  }
}

class FakeEventPublisher implements EventPublisherPort {
  public published: DomainEvent[] = [];
  async publish(events: DomainEvent[]): Promise<void> {
    this.published.push(...events);
  }
}

describe("CreateResourceUseCase", () => {
  const tenantId = randomUUID();
  const venue = Venue.create({ id: randomUUID(), tenantId, name: "Unidade Norte" });

  it("creates a resource under an existing venue", async () => {
    const resources = new FakeResourceRepository();
    const publisher = new FakeEventPublisher();
    const useCase = new CreateResourceUseCase(new FakeVenueRepository([venue]), resources, publisher);

    const resource = await useCase.execute({
      tenantId,
      venueId: venue.id,
      name: "Portão principal",
      defaultCapacity: 500,
      hardCapacity: true,
      actorUserId: randomUUID(),
    });

    expect(resources.created).toHaveLength(1);
    expect(resource.hardCapacity).toBe(true);
    expect(publisher.published[0]?.type).toBe(RESOURCE_CREATED);
  });

  it("rejects resource creation when the parent venue does not exist", async () => {
    const resources = new FakeResourceRepository();
    const useCase = new CreateResourceUseCase(
      new FakeVenueRepository([]),
      resources,
      new FakeEventPublisher(),
    );

    await expect(
      useCase.execute({
        tenantId,
        venueId: randomUUID(),
        name: "Portão",
        defaultCapacity: 100,
        actorUserId: randomUUID(),
      }),
    ).rejects.toBeInstanceOf(ParentVenueNotFoundError);
    expect(resources.created).toHaveLength(0);
  });

  it("rejects an invalid default capacity", async () => {
    const resources = new FakeResourceRepository();
    const useCase = new CreateResourceUseCase(
      new FakeVenueRepository([venue]),
      resources,
      new FakeEventPublisher(),
    );

    await expect(
      useCase.execute({ tenantId, venueId: venue.id, name: "Portão", defaultCapacity: -5, actorUserId: randomUUID() }),
    ).rejects.toBeInstanceOf(InvalidResourceError);
  });
});
