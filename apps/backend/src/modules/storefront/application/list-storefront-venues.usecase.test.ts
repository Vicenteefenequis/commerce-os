import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { ListStorefrontVenuesUseCase, TenantNotFoundError } from "./list-storefront-venues.usecase.js";
import { Organization } from "../../organization/domain/organization.entity.js";
import type { OrganizationRepositoryPort } from "../../organization/domain/ports.js";
import { Venue } from "../../venue/domain/venue.entity.js";
import type { VenueRepositoryPort } from "../../venue/domain/ports.js";
import type { TenantContextPort } from "../domain/ports.js";

class FakeOrganizationRepository implements OrganizationRepositoryPort {
  constructor(private readonly organization: Organization | null = null) {}
  async create(): Promise<Organization> {
    throw new Error("not used in this test");
  }
  async findById(): Promise<Organization | null> {
    throw new Error("not used in this test");
  }
  async findBySlug(slug: string): Promise<Organization | null> {
    return this.organization && this.organization.slug === slug ? this.organization : null;
  }
  async listAll(): Promise<Organization[]> {
    throw new Error("not used in this test");
  }
  async setVerified(): Promise<Organization | null> {
    throw new Error("not used in this test");
  }
}

class FakeVenueRepository implements VenueRepositoryPort {
  constructor(private readonly venues: Venue[] = []) {}
  async create(): Promise<Venue> {
    throw new Error("not used in this test");
  }
  async listByTenant(tenantId: string): Promise<Venue[]> {
    return this.venues.filter((v) => v.tenantId === tenantId);
  }
  async findById(): Promise<Venue | null> {
    throw new Error("not used in this test");
  }
  async findBySlug(): Promise<Venue | null> {
    throw new Error("not used in this test");
  }
  async update(): Promise<Venue | null> {
    throw new Error("not used in this test");
  }
}

class FakeTenantContext implements TenantContextPort {
  public calls: string[] = [];
  async setTenantId(tenantId: string): Promise<void> {
    this.calls.push(tenantId);
  }
}

describe("ListStorefrontVenuesUseCase", () => {
  it("resolves the tenant by slug and lists only that tenant's venues", async () => {
    const tenantId = randomUUID();
    const organization = Organization.create({ id: tenantId, name: "Zoo Municipal", slug: "zoo-municipal" });
    const venue = Venue.create({ id: randomUUID(), tenantId, name: "Savana Africana", slug: "savana-africana" });
    const otherTenantVenue = Venue.create({
      id: randomUUID(),
      tenantId: randomUUID(),
      name: "Outro",
      slug: "outro",
    });
    const tenantContext = new FakeTenantContext();

    const useCase = new ListStorefrontVenuesUseCase(
      new FakeOrganizationRepository(organization),
      new FakeVenueRepository([venue, otherTenantVenue]),
      tenantContext,
    );

    const result = await useCase.execute("zoo-municipal");

    expect(result.tenant.id).toBe(tenantId);
    expect(result.venues).toEqual([venue]);
    expect(tenantContext.calls).toEqual([tenantId]);
  });

  it("throws TenantNotFoundError for an unknown slug", async () => {
    const tenantContext = new FakeTenantContext();
    const useCase = new ListStorefrontVenuesUseCase(
      new FakeOrganizationRepository(null),
      new FakeVenueRepository([]),
      tenantContext,
    );

    await expect(useCase.execute("does-not-exist")).rejects.toBeInstanceOf(TenantNotFoundError);
    expect(tenantContext.calls).toEqual([]);
  });
});
