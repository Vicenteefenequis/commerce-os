import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { ListDiscoverableTenantsUseCase } from "./list-discoverable-tenants.usecase.js";
import { Organization } from "../../organization/domain/organization.entity.js";
import type { OrganizationRepositoryPort } from "../../organization/domain/ports.js";
import { Venue } from "../../venue/domain/venue.entity.js";
import type { VenueRepositoryPort } from "../../venue/domain/ports.js";
import { Product, ProductVariant } from "../../catalog/domain/product.entity.js";
import type { ProductRepositoryPort } from "../../catalog/domain/ports.js";
import type { TenantContextPort } from "../domain/ports.js";

class FakeOrganizationRepository implements OrganizationRepositoryPort {
  constructor(private readonly organizations: Organization[]) {}
  async create(): Promise<Organization> {
    throw new Error("not used in this test");
  }
  async findById(): Promise<Organization | null> {
    throw new Error("not used in this test");
  }
  async findBySlug(): Promise<Organization | null> {
    throw new Error("not used in this test");
  }
  async listAll(): Promise<Organization[]> {
    return this.organizations;
  }
}

class FakeVenueRepository implements VenueRepositoryPort {
  constructor(private readonly venues: Venue[]) {}
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

class FakeProductRepository implements ProductRepositoryPort {
  constructor(private readonly productsByVenue: Map<string, Product[]>) {}
  async create(): Promise<Product> {
    throw new Error("not used in this test");
  }
  async findById(): Promise<Product | null> {
    throw new Error("not used in this test");
  }
  async listByVenue(_tenantId: string, venueId: string): Promise<Product[]> {
    return this.productsByVenue.get(venueId) ?? [];
  }
  async update(): Promise<Product> {
    throw new Error("not used in this test");
  }
  async addVariantPriceChange(): Promise<{ variantId: string; previousPriceCents: number; newPriceCents: number }> {
    throw new Error("not used in this test");
  }
  async findVariantById(): Promise<null> {
    throw new Error("not used in this test");
  }
}

class FakeTenantContext implements TenantContextPort {
  public calls: string[] = [];
  async setTenantId(tenantId: string): Promise<void> {
    this.calls.push(tenantId);
  }
}

function activeProduct(tenantId: string, venueId: string): Product {
  return Product.create({
    id: randomUUID(),
    tenantId,
    venueId,
    name: "Ingresso",
    channels: [],
    variants: [ProductVariant.create({ id: randomUUID(), productId: "p", tenantId, name: "Único", priceCents: 100 })],
  });
}

function makeVenue(tenantId: string, overrides: Partial<Parameters<typeof Venue.create>[0]> = {}): Venue {
  return Venue.create({
    id: randomUUID(),
    tenantId,
    name: "Bar do Zé",
    slug: "bar-do-ze",
    published: true,
    coverPhotoUrl: "https://example.com/photo.jpg",
    city: "São Paulo",
    category: "Bar",
    ...overrides,
  });
}

describe("ListDiscoverableTenantsUseCase", () => {
  it("returns an eligible tenant matching the query", async () => {
    const org = Organization.create({ id: randomUUID(), name: "Bar do João", slug: "bar-do-joao" });
    const venue = makeVenue(org.id);
    const products = new Map([[venue.id, [activeProduct(org.id, venue.id)]]]);

    const useCase = new ListDiscoverableTenantsUseCase(
      new FakeOrganizationRepository([org]),
      new FakeVenueRepository([venue]),
      new FakeProductRepository(products),
      new FakeTenantContext(),
    );

    const results = await useCase.execute({ q: "bar do joao" });
    expect(results).toEqual([{ tenantSlug: "bar-do-joao", organizationName: "Bar do João" }]);
  });

  it("matches an accented name against an unaccented query", async () => {
    const org = Organization.create({ id: randomUUID(), name: "Bar do João", slug: "bar-do-joao" });
    const venue = makeVenue(org.id);
    const products = new Map([[venue.id, [activeProduct(org.id, venue.id)]]]);

    const useCase = new ListDiscoverableTenantsUseCase(
      new FakeOrganizationRepository([org]),
      new FakeVenueRepository([venue]),
      new FakeProductRepository(products),
      new FakeTenantContext(),
    );

    const results = await useCase.execute({ q: "joao" });
    expect(results).toHaveLength(1);
  });

  it("excludes a tenant with no qualifying venue", async () => {
    const org = Organization.create({ id: randomUUID(), name: "Bar do João", slug: "bar-do-joao" });
    const venue = makeVenue(org.id, { published: false });
    const products = new Map([[venue.id, [activeProduct(org.id, venue.id)]]]);

    const useCase = new ListDiscoverableTenantsUseCase(
      new FakeOrganizationRepository([org]),
      new FakeVenueRepository([venue]),
      new FakeProductRepository(products),
      new FakeTenantContext(),
    );

    expect(await useCase.execute({ q: "joao" })).toHaveLength(0);
  });

  it("excludes a tenant whose name does not match the query", async () => {
    const org = Organization.create({ id: randomUUID(), name: "Zoo", slug: "zoo" });
    const venue = makeVenue(org.id);
    const products = new Map([[venue.id, [activeProduct(org.id, venue.id)]]]);

    const useCase = new ListDiscoverableTenantsUseCase(
      new FakeOrganizationRepository([org]),
      new FakeVenueRepository([venue]),
      new FakeProductRepository(products),
      new FakeTenantContext(),
    );

    expect(await useCase.execute({ q: "bar do joao" })).toHaveLength(0);
  });

  it("returns an empty result when no tenant matches, without error", async () => {
    const org = Organization.create({ id: randomUUID(), name: "Zoo", slug: "zoo" });
    const venue = makeVenue(org.id);
    const products = new Map([[venue.id, [activeProduct(org.id, venue.id)]]]);

    const useCase = new ListDiscoverableTenantsUseCase(
      new FakeOrganizationRepository([org]),
      new FakeVenueRepository([venue]),
      new FakeProductRepository(products),
      new FakeTenantContext(),
    );

    await expect(useCase.execute({ q: "nao existe" })).resolves.toEqual([]);
  });

  it("returns every eligible tenant when no query is given", async () => {
    const orgA = Organization.create({ id: randomUUID(), name: "Zoo A", slug: "zoo-a" });
    const orgB = Organization.create({ id: randomUUID(), name: "Zoo B", slug: "zoo-b" });
    const venueA = makeVenue(orgA.id, { slug: "venue-a" });
    const venueB = makeVenue(orgB.id, { slug: "venue-b" });
    const products = new Map([
      [venueA.id, [activeProduct(orgA.id, venueA.id)]],
      [venueB.id, [activeProduct(orgB.id, venueB.id)]],
    ]);

    const useCase = new ListDiscoverableTenantsUseCase(
      new FakeOrganizationRepository([orgA, orgB]),
      new FakeVenueRepository([venueA, venueB]),
      new FakeProductRepository(products),
      new FakeTenantContext(),
    );

    const results = await useCase.execute();
    expect(results.map((r) => r.tenantSlug).sort()).toEqual(["zoo-a", "zoo-b"]);
  });
});
