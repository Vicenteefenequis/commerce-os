import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import {
  CreateVenueUseCase,
  InvalidVenueSlugError,
  ParentOrganizationNotFoundError,
  VenueSlugAlreadyExistsError,
} from "./create-venue.usecase.js";
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
  async findBySlug(): Promise<Organization | null> {
    throw new Error("not used in this test");
  }
  async listAll(): Promise<Organization[]> {
    throw new Error("not used in this test");
  }
}

class FakeVenueRepository implements VenueRepositoryPort {
  public created: Venue[] = [];
  async create(venue: { id: string; tenantId: string; name: string; slug: string }): Promise<Venue> {
    const created = Venue.create(venue);
    this.created.push(created);
    return created;
  }
  async listByTenant(tenantId: string): Promise<Venue[]> {
    return this.created.filter((v) => v.tenantId === tenantId);
  }
  async findById(tenantId: string, id: string): Promise<Venue | null> {
    return this.created.find((v) => v.tenantId === tenantId && v.id === id) ?? null;
  }
  async findBySlug(tenantId: string, slug: string): Promise<Venue | null> {
    return this.created.find((v) => v.tenantId === tenantId && v.slug === slug) ?? null;
  }
  async update(): Promise<Venue | null> {
    throw new Error("not used in this test");
  }
}

describe("CreateVenueUseCase", () => {
  const tenantId = randomUUID();
  const organization = Organization.create({ id: tenantId, name: "Zoo Municipal", slug: "zoo-municipal" });

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

  it("generates a slug from the name when none is supplied", async () => {
    const venues = new FakeVenueRepository();
    const useCase = new CreateVenueUseCase(new FakeOrganizationRepository(organization), venues);

    const venue = await useCase.execute({ tenantId, name: "Savana Africana" });

    expect(venue.slug).toBe("savana-africana");
  });

  it("rejects a malformed slug", async () => {
    const venues = new FakeVenueRepository();
    const useCase = new CreateVenueUseCase(new FakeOrganizationRepository(organization), venues);

    await expect(
      useCase.execute({ tenantId, name: "Savana", slug: "Not Valid!" }),
    ).rejects.toBeInstanceOf(InvalidVenueSlugError);
  });

  it("rejects a duplicate slug within the same organization", async () => {
    const venues = new FakeVenueRepository();
    const useCase = new CreateVenueUseCase(new FakeOrganizationRepository(organization), venues);
    await useCase.execute({ tenantId, name: "Savana Africana", slug: "savana" });

    await expect(
      useCase.execute({ tenantId, name: "Outra Savana", slug: "savana" }),
    ).rejects.toBeInstanceOf(VenueSlugAlreadyExistsError);
    expect(venues.created).toHaveLength(1);
  });

  it("allows the same slug across different organizations", async () => {
    const otherTenantId = randomUUID();
    const otherOrganization = Organization.create({ id: otherTenantId, name: "Zoo Outro", slug: "zoo-outro" });

    const venues = new FakeVenueRepository();
    await new CreateVenueUseCase(new FakeOrganizationRepository(organization), venues).execute({
      tenantId,
      name: "Savana Africana",
      slug: "savana",
    });
    const venue = await new CreateVenueUseCase(
      new FakeOrganizationRepository(otherOrganization),
      venues,
    ).execute({ tenantId: otherTenantId, name: "Savana Africana", slug: "savana" });

    expect(venue.slug).toBe("savana");
    expect(venues.created).toHaveLength(2);
  });
});
