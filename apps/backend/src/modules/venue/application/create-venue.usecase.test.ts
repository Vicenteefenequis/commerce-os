import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { CreateVenueUseCase, ParentOrganizationNotFoundError } from "./create-venue.usecase.js";
import { Venue } from "../domain/venue.entity.js";
import type { VenueRepositoryPort } from "../domain/ports.js";
import { Organization } from "../../organization/domain/organization.entity.js";
import type { OrganizationRepositoryPort } from "../../organization/domain/ports.js";

class FakeOrganizationRepository implements OrganizationRepositoryPort {
  constructor(private readonly organization: Organization | null) {}
  async create(): Promise<Organization> {
    throw new Error("not used in this test");
  }
  async findById(id: string): Promise<Organization | null> {
    return this.organization && this.organization.id === id ? this.organization : null;
  }
}

class FakeVenueRepository implements VenueRepositoryPort {
  public created: Venue[] = [];
  async create(venue: { id: string; tenantId: string; name: string }): Promise<Venue> {
    const created = Venue.create(venue);
    this.created.push(created);
    return created;
  }
  async listByTenant(tenantId: string): Promise<Venue[]> {
    return this.created.filter((v) => v.tenantId === tenantId);
  }
}

describe("CreateVenueUseCase", () => {
  const tenantId = randomUUID();
  const organization = Organization.create({ id: tenantId, name: "Zoo Municipal" });

  it("creates a venue under an existing organization", async () => {
    const venues = new FakeVenueRepository();
    const useCase = new CreateVenueUseCase(new FakeOrganizationRepository(organization), venues);

    const venue = await useCase.execute({ tenantId, name: "Unidade Norte" });

    expect(venue.tenantId).toBe(tenantId);
    expect(venues.created).toHaveLength(1);
  });

  it("rejects venue creation when the parent organization does not exist", async () => {
    const venues = new FakeVenueRepository();
    const useCase = new CreateVenueUseCase(new FakeOrganizationRepository(null), venues);

    await expect(useCase.execute({ tenantId, name: "Unidade Norte" })).rejects.toBeInstanceOf(
      ParentOrganizationNotFoundError,
    );
    expect(venues.created).toHaveLength(0);
  });

  it("lists multiple venues for an organization", async () => {
    const venues = new FakeVenueRepository();
    const useCase = new CreateVenueUseCase(new FakeOrganizationRepository(organization), venues);
    await useCase.execute({ tenantId, name: "Unidade Norte" });
    await useCase.execute({ tenantId, name: "Unidade Sul" });

    const listed = await venues.listByTenant(tenantId);
    expect(listed).toHaveLength(2);
  });
});
