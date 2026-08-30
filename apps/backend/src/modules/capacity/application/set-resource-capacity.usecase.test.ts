import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import {
  ResourceNotFoundError,
  SetResourceCapacityUseCase,
} from "./set-resource-capacity.usecase.js";
import { Resource, InvalidResourceError } from "../domain/resource.entity.js";
import type { CapacityPeriodRepositoryPort, ResourceRepositoryPort } from "../domain/ports.js";
import type { DomainEvent } from "../../../events/domain-event.js";
import type { EventPublisherPort } from "../../../shared-kernel/ports.js";
import { RESOURCE_CAPACITY_SET } from "../domain/events.js";

class FakeResourceRepository implements ResourceRepositoryPort {
  constructor(private readonly resources: Resource[]) {}
  public defaultCapacityUpdates: Array<{ id: string; capacity: number }> = [];
  async create(): Promise<Resource> {
    throw new Error("not used in this test");
  }
  async findById(tenantId: string, id: string): Promise<Resource | null> {
    return this.resources.find((r) => r.tenantId === tenantId && r.id === id) ?? null;
  }
  async listByVenue(): Promise<Resource[]> {
    throw new Error("not used in this test");
  }
  async setDefaultCapacity(_tenantId: string, id: string, capacity: number): Promise<void> {
    this.defaultCapacityUpdates.push({ id, capacity });
  }
}

class FakeCapacityPeriodRepository implements CapacityPeriodRepositoryPort {
  public periodUpdates: Array<{ resourceId: string; period: string; capacity: number }> = [];
  async getConfiguredCapacity(): Promise<number> {
    throw new Error("not used in this test");
  }
  async setPeriodCapacity(_tenantId: string, resourceId: string, period: string, capacity: number): Promise<void> {
    this.periodUpdates.push({ resourceId, period, capacity });
  }
  async getCommittedAmount(): Promise<number> {
    throw new Error("not used in this test");
  }
}

class FakeEventPublisher implements EventPublisherPort {
  public published: DomainEvent[] = [];
  async publish(events: DomainEvent[]): Promise<void> {
    this.published.push(...events);
  }
}

describe("SetResourceCapacityUseCase", () => {
  const tenantId = randomUUID();
  const resource = Resource.create({
    id: randomUUID(),
    tenantId,
    venueId: randomUUID(),
    name: "Portão",
    defaultCapacity: 100,
    hardCapacity: true,
  });

  it("sets the default capacity when no period is given", async () => {
    const resources = new FakeResourceRepository([resource]);
    const periods = new FakeCapacityPeriodRepository();
    const publisher = new FakeEventPublisher();
    const useCase = new SetResourceCapacityUseCase(resources, periods, publisher);

    await useCase.execute({ tenantId, resourceId: resource.id, capacity: 150, actorUserId: randomUUID() });

    expect(resources.defaultCapacityUpdates).toEqual([{ id: resource.id, capacity: 150 }]);
    expect(periods.periodUpdates).toHaveLength(0);
    expect(publisher.published[0]?.type).toBe(RESOURCE_CAPACITY_SET);
  });

  it("sets a period override when a period is given", async () => {
    const resources = new FakeResourceRepository([resource]);
    const periods = new FakeCapacityPeriodRepository();
    const useCase = new SetResourceCapacityUseCase(resources, periods, new FakeEventPublisher());

    await useCase.execute({
      tenantId,
      resourceId: resource.id,
      period: "2026-06-15",
      capacity: 50,
      actorUserId: randomUUID(),
    });

    expect(periods.periodUpdates).toEqual([{ resourceId: resource.id, period: "2026-06-15", capacity: 50 }]);
    expect(resources.defaultCapacityUpdates).toHaveLength(0);
  });

  it("rejects setting capacity on a resource that does not exist", async () => {
    const resources = new FakeResourceRepository([]);
    const useCase = new SetResourceCapacityUseCase(
      resources,
      new FakeCapacityPeriodRepository(),
      new FakeEventPublisher(),
    );

    await expect(
      useCase.execute({ tenantId, resourceId: randomUUID(), capacity: 10, actorUserId: randomUUID() }),
    ).rejects.toBeInstanceOf(ResourceNotFoundError);
  });

  it("rejects a negative capacity", async () => {
    const resources = new FakeResourceRepository([resource]);
    const useCase = new SetResourceCapacityUseCase(
      resources,
      new FakeCapacityPeriodRepository(),
      new FakeEventPublisher(),
    );

    await expect(
      useCase.execute({ tenantId, resourceId: resource.id, capacity: -1, actorUserId: randomUUID() }),
    ).rejects.toBeInstanceOf(InvalidResourceError);
  });
});
