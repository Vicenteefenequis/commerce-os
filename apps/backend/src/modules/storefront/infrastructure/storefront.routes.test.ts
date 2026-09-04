import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { sql } from "kysely";
import request from "supertest";
import { createApp } from "../../../http/app.js";
import { db } from "../../../db/kysely.js";
import { slugify } from "../../../shared-kernel/slug.js";

/**
 * spec: storefront/catalog, storefront/tenant-entry - public,
 * unauthenticated venue/product/availability reads, addressed by
 * tenant/venue slug, tenant-scoped and filtered by channel visibility and
 * availability window. Requires a reachable Postgres; skips itself when
 * unreachable, same convention as dashboard.routes.test.ts.
 */
let dbReachable = true;

beforeAll(async () => {
  try {
    await sql`select 1`.execute(db);
  } catch {
    dbReachable = false;
  }
});

afterAll(async () => {
  if (dbReachable) {
    await db.destroy();
  }
});

async function seedTenantWithVenue(name: string) {
  const tenantId = randomUUID();
  const venueId = randomUUID();
  const tenantSlug = `${slugify(name)}-${tenantId.slice(0, 8)}`;
  const venueSlug = `${slugify(`${name} Venue`)}-${venueId.slice(0, 8)}`;
  await db.insertInto("organizations").values({ id: tenantId, name, slug: tenantSlug }).execute();
  await sql`select set_config('app.tenant_id', ${tenantId}, false)`.execute(db);
  await db
    .insertInto("venues")
    .values({ id: venueId, tenant_id: tenantId, name: `${name} Venue`, slug: venueSlug })
    .execute();
  return { tenantId, tenantSlug, venueId, venueSlug };
}

async function seedProduct(
  tenantId: string,
  venueId: string,
  overrides: {
    channels?: string[];
    availableFrom?: Date | null;
    availableUntil?: Date | null;
    resourceId?: string | null;
  } = {},
) {
  await sql`select set_config('app.tenant_id', ${tenantId}, false)`.execute(db);
  const productId = randomUUID();
  const variantId = randomUUID();
  await db
    .insertInto("products")
    .values({
      id: productId,
      tenant_id: tenantId,
      venue_id: venueId,
      name: "Ingresso",
      channels: overrides.channels ?? [],
      available_from: overrides.availableFrom ?? null,
      available_until: overrides.availableUntil ?? null,
    })
    .execute();
  await db
    .insertInto("product_variants")
    .values({
      id: variantId,
      tenant_id: tenantId,
      product_id: productId,
      name: "Único",
      price_cents: 2500,
      resource_id: overrides.resourceId ?? null,
    })
    .execute();
  return { productId, variantId };
}

async function seedResource(tenantId: string, venueId: string, defaultCapacity: number) {
  await sql`select set_config('app.tenant_id', ${tenantId}, false)`.execute(db);
  const resourceId = randomUUID();
  await db
    .insertInto("resources")
    .values({
      id: resourceId,
      tenant_id: tenantId,
      venue_id: venueId,
      name: "Trilha",
      default_capacity: defaultCapacity,
      hard_capacity: false,
    })
    .execute();
  return resourceId;
}

describe.skipIf(!dbReachable)("storefront catalog routes (live Postgres)", () => {
  it("GET /storefront/tenants/:tenantSlug resolves the tenant by slug", async () => {
    const a = await seedTenantWithVenue("Zoo Tenant Lookup");

    const app = createApp();
    const res = await request(app).get(`/storefront/tenants/${a.tenantSlug}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      tenantId: a.tenantId,
      tenantSlug: a.tenantSlug,
      organizationName: "Zoo Tenant Lookup",
    });
  });

  it("GET /storefront/tenants/:tenantSlug 404s for an unknown slug", async () => {
    const app = createApp();
    const res = await request(app).get("/storefront/tenants/does-not-exist");

    expect(res.status).toBe(404);
  });

  it("GET /storefront/tenants/:tenantSlug/venues is isolated by tenant and requires no authentication", async () => {
    const a = await seedTenantWithVenue("Zoo A");
    const b = await seedTenantWithVenue("Zoo B");

    const app = createApp();
    const res = await request(app).get(`/storefront/tenants/${a.tenantSlug}/venues`);

    expect(res.status).toBe(200);
    expect(res.body.organizationName).toBe("Zoo A");
    expect(res.body.venues).toHaveLength(1);
    expect(res.body.venues[0]).toMatchObject({ id: a.venueId, slug: a.venueSlug });
    expect(res.body.venues.map((v: { id: string }) => v.id)).not.toContain(b.venueId);
  });

  it("GET /storefront/tenants/:tenantSlug/venues 404s for an unknown tenant slug", async () => {
    const app = createApp();
    const res = await request(app).get("/storefront/tenants/does-not-exist/venues");

    expect(res.status).toBe(404);
  });

  it("GET /storefront/tenants/:tenantSlug/venues/:venueSlug/products includes visible+available products and excludes channel-hidden and out-of-window ones", async () => {
    const { tenantId, tenantSlug, venueId, venueSlug } = await seedTenantWithVenue("Zoo Catálogo");

    const visible = await seedProduct(tenantId, venueId, { channels: [] });
    const explicitlyOnStorefront = await seedProduct(tenantId, venueId, { channels: ["storefront"] });
    const hidden = await seedProduct(tenantId, venueId, { channels: ["admin-only"] });
    const notYetAvailable = await seedProduct(tenantId, venueId, {
      availableFrom: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    const noLongerAvailable = await seedProduct(tenantId, venueId, {
      availableUntil: new Date(Date.now() - 24 * 60 * 60 * 1000),
    });

    const app = createApp();
    const res = await request(app).get(`/storefront/tenants/${tenantSlug}/venues/${venueSlug}/products`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ tenantId, venueId, venueSlug });
    const ids = res.body.products.map((p: { id: string }) => p.id);
    expect(ids).toContain(visible.productId);
    expect(ids).toContain(explicitlyOnStorefront.productId);
    expect(ids).not.toContain(hidden.productId);
    expect(ids).not.toContain(notYetAvailable.productId);
    expect(ids).not.toContain(noLongerAvailable.productId);

    const returned = res.body.products.find((p: { id: string }) => p.id === visible.productId);
    expect(returned.variants[0]).toMatchObject({ name: "Único", priceCents: 2500 });
  });

  it("GET /storefront/tenants/:tenantSlug/venues/:venueSlug/products 404s for a venue slug that does not belong to the tenant", async () => {
    const { tenantSlug } = await seedTenantWithVenue("Zoo Sem Venue");
    const other = await seedTenantWithVenue("Zoo Outro");

    const app = createApp();
    const res = await request(app).get(`/storefront/tenants/${tenantSlug}/venues/${other.venueSlug}/products`);

    expect(res.status).toBe(404);
  });

  it("GET .../variants/:variantId/availability reports available capacity for a resource-backed variant", async () => {
    const { tenantId, tenantSlug, venueId, venueSlug } = await seedTenantWithVenue("Zoo Capacidade");
    const resourceId = await seedResource(tenantId, venueId, 40);
    const { variantId } = await seedProduct(tenantId, venueId, { resourceId });

    const app = createApp();
    const res = await request(app).get(
      `/storefront/tenants/${tenantSlug}/venues/${venueSlug}/variants/${variantId}/availability?period=2026-06-15`,
    );

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ variantId, constrained: true, availableCapacity: 40 });
  });

  it("GET .../variants/:variantId/availability reports no constraint for a variant without a resource", async () => {
    const { tenantId, tenantSlug, venueId, venueSlug } = await seedTenantWithVenue("Zoo Sem Recurso");
    const { variantId } = await seedProduct(tenantId, venueId, { resourceId: null });

    const app = createApp();
    const res = await request(app).get(
      `/storefront/tenants/${tenantSlug}/venues/${venueSlug}/variants/${variantId}/availability?period=2026-06-15`,
    );

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ variantId, constrained: false, availableCapacity: null });
  });

  it("GET .../variants/:variantId/availability 404s for a venue slug that does not belong to the tenant", async () => {
    const { tenantId, tenantSlug, venueId } = await seedTenantWithVenue("Zoo Availability Venue Mismatch");
    const other = await seedTenantWithVenue("Zoo Availability Outro");
    const { variantId } = await seedProduct(tenantId, venueId, { resourceId: null });

    const app = createApp();
    const res = await request(app).get(
      `/storefront/tenants/${tenantSlug}/venues/${other.venueSlug}/variants/${variantId}/availability?period=2026-06-15`,
    );

    expect(res.status).toBe(404);
  });

  it("GET .../profile returns the venue's showcase profile regardless of published status", async () => {
    const { tenantId, tenantSlug, venueId, venueSlug } = await seedTenantWithVenue("Zoo Vitrine");
    await sql`select set_config('app.tenant_id', ${tenantId}, false)`.execute(db);
    await db
      .updateTable("venues")
      .set({
        description: "Um zoológico",
        city: "São Paulo",
        category: "Parque",
        cover_photo_url: "https://example.com/photo.jpg",
        published: false,
      })
      .where("id", "=", venueId)
      .execute();

    const app = createApp();
    const res = await request(app).get(`/storefront/tenants/${tenantSlug}/venues/${venueSlug}/profile`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      tenantSlug,
      venueSlug,
      description: "Um zoológico",
      city: "São Paulo",
      category: "Parque",
      coverPhotoUrl: "https://example.com/photo.jpg",
    });
  });

  it("GET .../profile omits unset profile fields as null rather than erroring", async () => {
    const { tenantSlug, venueSlug } = await seedTenantWithVenue("Zoo Vitrine Vazia");

    const app = createApp();
    const res = await request(app).get(`/storefront/tenants/${tenantSlug}/venues/${venueSlug}/profile`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ description: null, city: null, category: null, coverPhotoUrl: null });
  });

  it("GET .../profile 404s for an unknown tenant slug", async () => {
    const app = createApp();
    const res = await request(app).get("/storefront/tenants/does-not-exist/venues/does-not-exist/profile");

    expect(res.status).toBe(404);
  });

  it("GET .../profile 404s for a venue slug that does not belong to the tenant", async () => {
    const { tenantSlug } = await seedTenantWithVenue("Zoo Vitrine Sem Venue");
    const other = await seedTenantWithVenue("Zoo Vitrine Outro");

    const app = createApp();
    const res = await request(app).get(`/storefront/tenants/${tenantSlug}/venues/${other.venueSlug}/profile`);

    expect(res.status).toBe(404);
  });

  async function seedDiscoverableVenue(
    orgName: string,
    overrides: { published?: boolean; coverPhotoUrl?: string | null; city?: string; category?: string } = {},
    withActiveProduct = true,
  ) {
    const { tenantId, tenantSlug, venueId, venueSlug } = await seedTenantWithVenue(orgName);
    await sql`select set_config('app.tenant_id', ${tenantId}, false)`.execute(db);
    await db
      .updateTable("venues")
      .set({
        published: overrides.published ?? true,
        cover_photo_url: overrides.coverPhotoUrl === undefined ? "https://example.com/photo.jpg" : overrides.coverPhotoUrl,
        city: overrides.city ?? "São Paulo",
        category: overrides.category ?? "Bar",
      })
      .where("id", "=", venueId)
      .execute();
    if (withActiveProduct) {
      await seedProduct(tenantId, venueId, { channels: [] });
    }
    return { tenantId, tenantSlug, venueId, venueSlug };
  }

  // Fan-out over every Organization (design.md - "Discovery reads by
  // fanning out per-tenant"): this suite's long-lived shared dev database
  // accumulates Organizations across every run, so these can legitimately
  // take longer than the default timeout - not a regression.
  it("GET /storefront/discovery/venues returns eligible venues across tenants", async () => {
    const a = await seedDiscoverableVenue("Zoo Discovery A");
    const b = await seedDiscoverableVenue("Zoo Discovery B");

    const app = createApp();
    const res = await request(app).get("/storefront/discovery/venues");

    expect(res.status).toBe(200);
    const slugs = res.body.venues.map((v: { venueSlug: string }) => v.venueSlug);
    expect(slugs).toContain(a.venueSlug);
    expect(slugs).toContain(b.venueSlug);
  }, 20000);

  it("GET /storefront/discovery/venues excludes unpublished venues, venues without a cover photo, and venues without an active product", async () => {
    const unpublished = await seedDiscoverableVenue("Zoo Discovery Unpublished", { published: false });
    const noPhoto = await seedDiscoverableVenue("Zoo Discovery No Photo", { coverPhotoUrl: null });
    const noProduct = await seedDiscoverableVenue("Zoo Discovery No Product", {}, false);

    const app = createApp();
    const res = await request(app).get("/storefront/discovery/venues");

    expect(res.status).toBe(200);
    const slugs = res.body.venues.map((v: { venueSlug: string }) => v.venueSlug);
    expect(slugs).not.toContain(unpublished.venueSlug);
    expect(slugs).not.toContain(noPhoto.venueSlug);
    expect(slugs).not.toContain(noProduct.venueSlug);
  }, 20000);

  it("GET /storefront/discovery/venues filters by city and category, combined", async () => {
    // Unique per run (not a fixed "Curitiba"/"Teatro" value): this suite
    // reuses a long-lived dev database across runs, so a fixed value would
    // accumulate matches from earlier runs and break exact-list assertions.
    const uniqueCity = `Curitiba-${randomUUID()}`;
    const uniqueCategory = `Teatro-${randomUUID()}`;
    const match = await seedDiscoverableVenue("Zoo Discovery Match", {
      city: uniqueCity,
      category: uniqueCategory,
    });
    const wrongCity = await seedDiscoverableVenue("Zoo Discovery Wrong City", {
      city: "Recife",
      category: uniqueCategory,
    });
    const wrongCategory = await seedDiscoverableVenue("Zoo Discovery Wrong Category", {
      city: uniqueCity,
      category: "Bar",
    });

    const app = createApp();
    const res = await request(app).get(
      `/storefront/discovery/venues?city=${encodeURIComponent(uniqueCity)}&category=${encodeURIComponent(uniqueCategory)}`,
    );

    expect(res.status).toBe(200);
    const slugs = res.body.venues.map((v: { venueSlug: string }) => v.venueSlug);
    expect(slugs).toEqual([match.venueSlug]);
    expect(slugs).not.toContain(wrongCity.venueSlug);
    expect(slugs).not.toContain(wrongCategory.venueSlug);
  }, 20000);

  it("GET /storefront/discovery/venues returns an empty result when no venue matches, without error", async () => {
    const app = createApp();
    const res = await request(app).get("/storefront/discovery/venues?city=Município Inexistente");

    expect(res.status).toBe(200);
    expect(res.body.venues).toEqual([]);
  }, 20000);

  it("GET /storefront/discovery/venues links each result to its showcase page via tenant/venue slugs", async () => {
    const venue = await seedDiscoverableVenue("Zoo Discovery Link");

    const app = createApp();
    const res = await request(app).get("/storefront/discovery/venues");

    const result = res.body.venues.find((v: { venueSlug: string }) => v.venueSlug === venue.venueSlug);
    expect(result).toMatchObject({ tenantSlug: venue.tenantSlug, venueSlug: venue.venueSlug });
  }, 20000);
});
