import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { ListResourcesUseCase } from "./list-resources.usecase.js";
import { Resource } from "../domain/resource.entity.js";
import type { ResourceRepositoryPort } from "../domain/ports.js";

class FakeResourceRepository implements ResourceRepositoryPort {
  constructor(private readonly resources: Resource[]) {}
  async create(): Promise<Resource> {
    throw new Error("not used in this test");
  }
  async findById(): Promise<Resource | null> {
    throw new Error("not used in this test");
  }
  async listByVenue(tenantId: string, venueId: string): Promise<Resource[]> {
    return this.resources.filter((r) => r.tenantId === tenantId && r.venueId === venueId);
  }
  async setDefaultCapacity(): Promise<void> {
    throw new Error("not used in this test");
  }
}

describe("ListResourcesUseCase", () => {
  it("lists only resources belonging to the requesting tenant's venue (spec: capacity/resource - Resource belongs to a single tenant)", async () => {
    const venueId = randomUUID();
    const tenantA = randomUUID();
    const tenantB = randomUUID();
    const resourceA = Resource.create({
      id: randomUUID(),
      tenantId: tenantA,
      venueId,
      name: "Portão A",
      defaultCapacity: 100,
      hardCapacity: false,
    });
    const resourceB = Resource.create({
      id: randomUUID(),
      tenantId: tenantB,
      venueId,
      name: "Portão B",
      defaultCapacity: 100,
      hardCapacity: false,
    });

    const resources = await new ListResourcesUseCase(new FakeResourceRepository([resourceA, resourceB])).execute(
      tenantA,
      venueId,
    );

    expect(resources).toHaveLength(1);
    expect(resources[0]?.tenantId).toBe(tenantA);
  });
});
