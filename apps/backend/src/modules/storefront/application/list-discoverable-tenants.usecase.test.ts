import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { ListDiscoverableTenantsUseCase } from "./list-discoverable-tenants.usecase.js";
import { Organization } from "../../organization/domain/organization.entity.js";
import type { OrganizationRepositoryPort } from "../../organization/domain/ports.js";
import { Venue } from "../../venue/domain/venue.entity.js";
import type { VenueRepositoryPort } from "../../venue/domain/ports.js";
import { Product, ProductVariant } from "../../catalog/domain/product.entity.js";
import type { ProductRepositoryPort } from "../../catalog/domain/ports.js";
import type { CapacityPeriodRepositoryPort } from "../../capacity/domain/ports.js";
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
  async setVerified(): Promise<Organization | null> {
    throw new Error("not used in this test");
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

class FakeCapacityPeriodRepository implements CapacityPeriodRepositoryPort {
  constructor(
    private readonly byResource: Map<string, { configured: number; committed: number }> = new Map(),
  ) {}
  async getConfiguredCapacity(_tenantId: string, resourceId: string): Promise<number> {
    return this.byResource.get(resourceId)?.configured ?? 0;
  }
  async setPeriodCapacity(): Promise<void> {
    throw new Error("not used in this test");
  }
  async getCommittedAmount(_tenantId: string, resourceId: string): Promise<number> {
    return this.byResource.get(resourceId)?.committed ?? 0;
  }
}

class FakeTenantContext implements TenantContextPort {
  public calls: string[] = [];
  async setTenantId(tenantId: string): Promise<void> {
    this.calls.push(tenantId);
  }
}

function activeProduct(
  tenantId: string,
  venueId: string,
  overrides: { priceCents?: number; resourceId?: string | null } = {},
): Product {
  return Product.create({
    id: randomUUID(),
    tenantId,
    venueId,
    name: "Ingresso",
    channels: [],
    variants: [
      ProductVariant.create({
        id: randomUUID(),
        productId: "p",
        tenantId,
        name: "Único",
        priceCents: overrides.priceCents ?? 100,
        resourceId: overrides.resourceId,
      }),
    ],
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

function buildUseCase(opts: {
  organizations: Organization[];
  venues: Venue[];
  productsByVenue: Map<string, Product[]>;
  capacityByResource?: Map<string, { configured: number; committed: number }>;
  now?: Date;
}) {
  return new ListDiscoverableTenantsUseCase(
    new FakeOrganizationRepository(opts.organizations),
    new FakeVenueRepository(opts.venues),
    new FakeProductRepository(opts.productsByVenue),
    new FakeCapacityPeriodRepository(opts.capacityByResource),
    new FakeTenantContext(),
    opts.now ? () => opts.now! : undefined,
  );
}

describe("ListDiscoverableTenantsUseCase", () => {
  it("returns an eligible tenant matching the query", async () => {
    const org = Organization.create({ id: randomUUID(), name: "Bar do João", slug: "bar-do-joao" });
    const venue = makeVenue(org.id);
    const products = new Map([[venue.id, [activeProduct(org.id, venue.id)]]]);

    const useCase = buildUseCase({ organizations: [org], venues: [venue], productsByVenue: products });

    const { tenants } = await useCase.execute({ q: "bar do joao" });
    expect(tenants).toHaveLength(1);
    expect(tenants[0]).toMatchObject({ tenantSlug: "bar-do-joao", organizationName: "Bar do João" });
  });

  it("matches an accented name against an unaccented query", async () => {
    const org = Organization.create({ id: randomUUID(), name: "Bar do João", slug: "bar-do-joao" });
    const venue = makeVenue(org.id);
    const products = new Map([[venue.id, [activeProduct(org.id, venue.id)]]]);

    const useCase = buildUseCase({ organizations: [org], venues: [venue], productsByVenue: products });

    const { tenants } = await useCase.execute({ q: "joao" });
    expect(tenants).toHaveLength(1);
  });

  it("excludes a tenant with no qualifying venue", async () => {
    const org = Organization.create({ id: randomUUID(), name: "Bar do João", slug: "bar-do-joao" });
    const venue = makeVenue(org.id, { published: false });
    const products = new Map([[venue.id, [activeProduct(org.id, venue.id)]]]);

    const useCase = buildUseCase({ organizations: [org], venues: [venue], productsByVenue: products });

    expect((await useCase.execute({ q: "joao" })).tenants).toHaveLength(0);
  });

  it("excludes a tenant whose name does not match the query", async () => {
    const org = Organization.create({ id: randomUUID(), name: "Zoo", slug: "zoo" });
    const venue = makeVenue(org.id);
    const products = new Map([[venue.id, [activeProduct(org.id, venue.id)]]]);

    const useCase = buildUseCase({ organizations: [org], venues: [venue], productsByVenue: products });

    expect((await useCase.execute({ q: "bar do joao" })).tenants).toHaveLength(0);
  });

  it("returns an empty result when no tenant matches, without error", async () => {
    const org = Organization.create({ id: randomUUID(), name: "Zoo", slug: "zoo" });
    const venue = makeVenue(org.id);
    const products = new Map([[venue.id, [activeProduct(org.id, venue.id)]]]);

    const useCase = buildUseCase({ organizations: [org], venues: [venue], productsByVenue: products });

    await expect(useCase.execute({ q: "nao existe" })).resolves.toEqual({ tenants: [], categoryFacets: [] });
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

    const useCase = buildUseCase({
      organizations: [orgA, orgB],
      venues: [venueA, venueB],
      productsByVenue: products,
    });

    const { tenants } = await useCase.execute();
    expect(tenants.map((r) => r.tenantSlug).sort()).toEqual(["zoo-a", "zoo-b"]);
  });

  it("combines name and category filter", async () => {
    const orgA = Organization.create({ id: randomUUID(), name: "Bar A", slug: "bar-a" });
    const orgB = Organization.create({ id: randomUUID(), name: "Bar B", slug: "bar-b" });
    const venueA = makeVenue(orgA.id, { slug: "venue-a", category: "Bares" });
    const venueB = makeVenue(orgB.id, { slug: "venue-b", category: "Baladas" });
    const products = new Map([
      [venueA.id, [activeProduct(orgA.id, venueA.id)]],
      [venueB.id, [activeProduct(orgB.id, venueB.id)]],
    ]);

    const useCase = buildUseCase({
      organizations: [orgA, orgB],
      venues: [venueA, venueB],
      productsByVenue: products,
    });

    const { tenants } = await useCase.execute({ q: "bar", category: "Bares" });
    expect(tenants.map((r) => r.tenantSlug)).toEqual(["bar-a"]);
  });

  it("returns the default browse set with no filters", async () => {
    const org = Organization.create({ id: randomUUID(), name: "Zoo", slug: "zoo" });
    const venue = makeVenue(org.id);
    const products = new Map([[venue.id, [activeProduct(org.id, venue.id)]]]);

    const useCase = buildUseCase({ organizations: [org], venues: [venue], productsByVenue: products });

    const { tenants } = await useCase.execute();
    expect(tenants).toHaveLength(1);
  });

  it("excludes sold-out results by default and includes them when requested", async () => {
    const org = Organization.create({ id: randomUUID(), name: "Casa Cheia", slug: "casa-cheia" });
    const venue = makeVenue(org.id);
    const resourceId = randomUUID();
    const products = new Map([[venue.id, [activeProduct(org.id, venue.id, { resourceId })]]]);
    const capacity = new Map([[resourceId, { configured: 10, committed: 10 }]]);

    const useCase = buildUseCase({
      organizations: [org],
      venues: [venue],
      productsByVenue: products,
      capacityByResource: capacity,
    });

    expect((await useCase.execute()).tenants).toHaveLength(0);
    expect((await useCase.execute({ availability: "include-sold-out" })).tenants).toHaveLength(1);
  });

  it("excludes results above the price ceiling", async () => {
    const org = Organization.create({ id: randomUUID(), name: "Caro", slug: "caro" });
    const venue = makeVenue(org.id);
    const products = new Map([[venue.id, [activeProduct(org.id, venue.id, { priceCents: 9000 })]]]);

    const useCase = buildUseCase({ organizations: [org], venues: [venue], productsByVenue: products });

    expect((await useCase.execute({ maxPriceCents: 8000 })).tenants).toHaveLength(0);
    expect((await useCase.execute({ maxPriceCents: 10000 })).tenants).toHaveLength(1);
  });

  it("computes category facet counts against every other active filter, excluding the category itself", async () => {
    const orgA = Organization.create({ id: randomUUID(), name: "Bar A", slug: "bar-a" });
    const orgB = Organization.create({ id: randomUUID(), name: "Bar B", slug: "bar-b" });
    const orgC = Organization.create({ id: randomUUID(), name: "Balada C", slug: "balada-c" });
    const venueA = makeVenue(orgA.id, { slug: "venue-a", category: "Bares" });
    const venueB = makeVenue(orgB.id, { slug: "venue-b", category: "Bares" });
    const venueC = makeVenue(orgC.id, { slug: "venue-c", category: "Baladas" });
    const products = new Map([
      [venueA.id, [activeProduct(orgA.id, venueA.id)]],
      [venueB.id, [activeProduct(orgB.id, venueB.id)]],
      [venueC.id, [activeProduct(orgC.id, venueC.id)]],
    ]);

    const useCase = buildUseCase({
      organizations: [orgA, orgB, orgC],
      venues: [venueA, venueB, venueC],
      productsByVenue: products,
    });

    const noCategory = await useCase.execute();
    expect(noCategory.categoryFacets.sort((a, b) => a.category.localeCompare(b.category))).toEqual([
      { category: "Baladas", count: 1 },
      { category: "Bares", count: 2 },
    ]);

    const withCategory = await useCase.execute({ category: "Bares" });
    expect(withCategory.categoryFacets.sort((a, b) => a.category.localeCompare(b.category))).toEqual([
      { category: "Baladas", count: 1 },
      { category: "Bares", count: 2 },
    ]);
  });

  it("sorts by ascending distance and puts venues without coordinates last", async () => {
    const orgNear = Organization.create({ id: randomUUID(), name: "Perto", slug: "perto" });
    const orgFar = Organization.create({ id: randomUUID(), name: "Longe", slug: "longe" });
    const orgNoCoords = Organization.create({ id: randomUUID(), name: "Sem Coordenadas", slug: "sem-coords" });
    const venueNear = makeVenue(orgNear.id, { slug: "venue-near", latitude: -23.55, longitude: -46.63 });
    const venueFar = makeVenue(orgFar.id, { slug: "venue-far", latitude: -22.9, longitude: -43.2 });
    const venueNoCoords = makeVenue(orgNoCoords.id, { slug: "venue-no-coords" });
    const products = new Map([
      [venueNear.id, [activeProduct(orgNear.id, venueNear.id)]],
      [venueFar.id, [activeProduct(orgFar.id, venueFar.id)]],
      [venueNoCoords.id, [activeProduct(orgNoCoords.id, venueNoCoords.id)]],
    ]);

    const useCase = buildUseCase({
      organizations: [orgFar, orgNoCoords, orgNear],
      venues: [venueFar, venueNoCoords, venueNear],
      productsByVenue: products,
    });

    const { tenants } = await useCase.execute({ lat: -23.55, lng: -46.63 });
    expect(tenants.map((t) => t.tenantSlug)).toEqual(["perto", "longe", "sem-coords"]);
  });

  it("computes the most-relevant-offer capacity percentage and omits it when there is no resource-backed product", async () => {
    const orgWithCapacity = Organization.create({ id: randomUUID(), name: "Com Capacidade", slug: "com-capacidade" });
    const orgWithout = Organization.create({ id: randomUUID(), name: "Sem Capacidade", slug: "sem-capacidade" });
    const venueWith = makeVenue(orgWithCapacity.id, { slug: "venue-with" });
    const venueWithout = makeVenue(orgWithout.id, { slug: "venue-without" });
    const resourceId = randomUUID();
    const products = new Map([
      [venueWith.id, [activeProduct(orgWithCapacity.id, venueWith.id, { resourceId })]],
      [venueWithout.id, [activeProduct(orgWithout.id, venueWithout.id)]],
    ]);
    const capacity = new Map([[resourceId, { configured: 100, committed: 62 }]]);

    const useCase = buildUseCase({
      organizations: [orgWithCapacity, orgWithout],
      venues: [venueWith, venueWithout],
      productsByVenue: products,
      capacityByResource: capacity,
    });

    const { tenants } = await useCase.execute();
    const withCapacity = tenants.find((t) => t.tenantSlug === "com-capacidade");
    const without = tenants.find((t) => t.tenantSlug === "sem-capacidade");
    expect(withCapacity?.capacityPercentFull).toBe(62);
    expect(without?.capacityPercentFull).toBeNull();
  });
});
