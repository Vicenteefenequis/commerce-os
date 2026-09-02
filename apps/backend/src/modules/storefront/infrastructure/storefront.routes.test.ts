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
});
