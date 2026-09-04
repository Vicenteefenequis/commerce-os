import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { ListDiscoverableVenuesUseCase } from "./list-discoverable-venues.usecase.js";
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

describe("ListDiscoverableVenuesUseCase", () => {
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

  it("includes a published venue with a photo and an active product", async () => {
    const org = Organization.create({ id: randomUUID(), name: "Zoo", slug: "zoo" });
    const venue = makeVenue(org.id);
    const products = new Map([[venue.id, [activeProduct(org.id, venue.id)]]]);

    const useCase = new ListDiscoverableVenuesUseCase(
      new FakeOrganizationRepository([org]),
      new FakeVenueRepository([venue]),
      new FakeProductRepository(products),
      new FakeTenantContext(),
    );

    const results = await useCase.execute();
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ tenantSlug: "zoo", venueSlug: "bar-do-ze" });
  });

  it("excludes an unpublished venue", async () => {
    const org = Organization.create({ id: randomUUID(), name: "Zoo", slug: "zoo" });
    const venue = makeVenue(org.id, { published: false });
    const products = new Map([[venue.id, [activeProduct(org.id, venue.id)]]]);

    const useCase = new ListDiscoverableVenuesUseCase(
      new FakeOrganizationRepository([org]),
      new FakeVenueRepository([venue]),
      new FakeProductRepository(products),
      new FakeTenantContext(),
    );

    expect(await useCase.execute()).toHaveLength(0);
  });

  it("excludes a published venue without a cover photo", async () => {
    const org = Organization.create({ id: randomUUID(), name: "Zoo", slug: "zoo" });
    const venue = makeVenue(org.id, { coverPhotoUrl: null });
    const products = new Map([[venue.id, [activeProduct(org.id, venue.id)]]]);

    const useCase = new ListDiscoverableVenuesUseCase(
      new FakeOrganizationRepository([org]),
      new FakeVenueRepository([venue]),
      new FakeProductRepository(products),
      new FakeTenantContext(),
    );

    expect(await useCase.execute()).toHaveLength(0);
  });

  it("excludes a published venue with no eligible product", async () => {
    const org = Organization.create({ id: randomUUID(), name: "Zoo", slug: "zoo" });
    const venue = makeVenue(org.id);

    const useCase = new ListDiscoverableVenuesUseCase(
      new FakeOrganizationRepository([org]),
      new FakeVenueRepository([venue]),
      new FakeProductRepository(new Map()),
      new FakeTenantContext(),
    );

    expect(await useCase.execute()).toHaveLength(0);
  });

  it("filters by city", async () => {
    const org = Organization.create({ id: randomUUID(), name: "Zoo", slug: "zoo" });
    const spVenue = makeVenue(org.id, { city: "São Paulo" });
    const rjVenue = makeVenue(org.id, { city: "Rio de Janeiro", slug: "bar-carioca" });
    const products = new Map([
      [spVenue.id, [activeProduct(org.id, spVenue.id)]],
      [rjVenue.id, [activeProduct(org.id, rjVenue.id)]],
    ]);

    const useCase = new ListDiscoverableVenuesUseCase(
      new FakeOrganizationRepository([org]),
      new FakeVenueRepository([spVenue, rjVenue]),
      new FakeProductRepository(products),
      new FakeTenantContext(),
    );

    const results = await useCase.execute({ city: "São Paulo" });
    expect(results.map((r) => r.venueSlug)).toEqual(["bar-do-ze"]);
  });

  it("filters by category", async () => {
    const org = Organization.create({ id: randomUUID(), name: "Zoo", slug: "zoo" });
    const bar = makeVenue(org.id, { category: "Bar" });
    const teatro = makeVenue(org.id, { category: "Teatro", slug: "teatro-central" });
    const products = new Map([
      [bar.id, [activeProduct(org.id, bar.id)]],
      [teatro.id, [activeProduct(org.id, teatro.id)]],
    ]);

    const useCase = new ListDiscoverableVenuesUseCase(
      new FakeOrganizationRepository([org]),
      new FakeVenueRepository([bar, teatro]),
      new FakeProductRepository(products),
      new FakeTenantContext(),
    );

    const results = await useCase.execute({ category: "Teatro" });
    expect(results.map((r) => r.venueSlug)).toEqual(["teatro-central"]);
  });

  it("applies combined city and category filters", async () => {
    const org = Organization.create({ id: randomUUID(), name: "Zoo", slug: "zoo" });
    const match = makeVenue(org.id, { city: "São Paulo", category: "Bar", slug: "match" });
    const wrongCity = makeVenue(org.id, { city: "Rio de Janeiro", category: "Bar", slug: "wrong-city" });
    const wrongCategory = makeVenue(org.id, { city: "São Paulo", category: "Teatro", slug: "wrong-category" });
    const products = new Map([
      [match.id, [activeProduct(org.id, match.id)]],
      [wrongCity.id, [activeProduct(org.id, wrongCity.id)]],
      [wrongCategory.id, [activeProduct(org.id, wrongCategory.id)]],
    ]);

    const useCase = new ListDiscoverableVenuesUseCase(
      new FakeOrganizationRepository([org]),
      new FakeVenueRepository([match, wrongCity, wrongCategory]),
      new FakeProductRepository(products),
      new FakeTenantContext(),
    );

    const results = await useCase.execute({ city: "São Paulo", category: "Bar" });
    expect(results.map((r) => r.venueSlug)).toEqual(["match"]);
  });

  it("returns an empty result when no venue matches, without error", async () => {
    const org = Organization.create({ id: randomUUID(), name: "Zoo", slug: "zoo" });
    const venue = makeVenue(org.id, { city: "Curitiba" });
    const products = new Map([[venue.id, [activeProduct(org.id, venue.id)]]]);

    const useCase = new ListDiscoverableVenuesUseCase(
      new FakeOrganizationRepository([org]),
      new FakeVenueRepository([venue]),
      new FakeProductRepository(products),
      new FakeTenantContext(),
    );

    await expect(useCase.execute({ city: "Belém" })).resolves.toEqual([]);
  });

  it("aggregates results across multiple organizations", async () => {
    const orgA = Organization.create({ id: randomUUID(), name: "Zoo A", slug: "zoo-a" });
    const orgB = Organization.create({ id: randomUUID(), name: "Zoo B", slug: "zoo-b" });
    const venueA = makeVenue(orgA.id, { slug: "venue-a" });
    const venueB = makeVenue(orgB.id, { slug: "venue-b" });
    const products = new Map([
      [venueA.id, [activeProduct(orgA.id, venueA.id)]],
      [venueB.id, [activeProduct(orgB.id, venueB.id)]],
    ]);

    const useCase = new ListDiscoverableVenuesUseCase(
      new FakeOrganizationRepository([orgA, orgB]),
      new FakeVenueRepository([venueA, venueB]),
      new FakeProductRepository(products),
      new FakeTenantContext(),
    );

    const results = await useCase.execute();
    expect(results.map((r) => r.venueSlug).sort()).toEqual(["venue-a", "venue-b"]);
  });
});
