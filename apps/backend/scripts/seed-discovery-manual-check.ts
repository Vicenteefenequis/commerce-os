import { randomUUID } from "node:crypto";
import { sql } from "kysely";
import { db } from "../src/db/kysely.js";

/**
 * Seeds a mixed set of discoverable tenants for manually exercising the
 * expand-storefront-discovery-grid filter matrix at /loja: one verified +
 * sold-out, one unverified + near-capacity (>90%), and one with no
 * resource-backed product (no capacity figure, no verified badge).
 */
async function seedTenant(opts: {
  name: string;
  category: string;
  priceCents: number;
  lat: number;
  lng: number;
  verified: boolean;
  capacity?: { configured: number; committed: number };
}) {
  const tenantId = randomUUID();
  const venueId = randomUUID();
  const productId = randomUUID();
  const variantId = randomUUID();
  const slug = `${opts.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${tenantId.slice(0, 8)}`;

  await db.insertInto("organizations").values({ id: tenantId, name: opts.name, slug }).execute();
  await sql`select set_config('app.tenant_id', ${tenantId}, false)`.execute(db);

  if (opts.verified) {
    await db.updateTable("organizations").set({ verified: true }).where("id", "=", tenantId).execute();
  }

  await db
    .insertInto("venues")
    .values({
      id: venueId,
      tenant_id: tenantId,
      name: opts.name,
      slug: "unidade-1",
      category: opts.category,
      cover_photo_url: "https://images.unsplash.com/photo-1514933651103-005eec06c04b",
      published: true,
      latitude: opts.lat,
      longitude: opts.lng,
    })
    .execute();

  await db
    .insertInto("products")
    .values({ id: productId, tenant_id: tenantId, venue_id: venueId, name: "Ingresso", channels: [] })
    .execute();

  let resourceId: string | null = null;
  if (opts.capacity) {
    resourceId = randomUUID();
    await db
      .insertInto("resources")
      .values({
        id: resourceId,
        tenant_id: tenantId,
        venue_id: venueId,
        name: "Capacidade",
        default_capacity: opts.capacity.configured,
        hard_capacity: true,
      })
      .execute();
    if (opts.capacity.committed > 0) {
      await db
        .insertInto("resource_capacity_commitments")
        .values({
          id: randomUUID(),
          tenant_id: tenantId,
          resource_id: resourceId,
          period: new Date().toISOString().slice(0, 10),
          amount: opts.capacity.committed,
          status: "held",
        })
        .execute();
    }
  }

  await db
    .insertInto("product_variants")
    .values({
      id: variantId,
      tenant_id: tenantId,
      product_id: productId,
      name: "Inteira",
      price_cents: opts.priceCents,
      resource_id: resourceId,
    })
    .execute();

  return { tenantId, slug };
}

async function main() {
  const results: Record<string, unknown> = {};

  results.verifiedSoldOut = await seedTenant({
    name: "Bar Verificado Lotado",
    category: "Bares",
    priceCents: 5000,
    lat: -23.55,
    lng: -46.63,
    verified: true,
    capacity: { configured: 20, committed: 20 },
  });

  results.unverifiedNearCapacity = await seedTenant({
    name: "Balada Quase Cheia",
    category: "Baladas",
    priceCents: 8000,
    lat: -23.56,
    lng: -46.64,
    verified: false,
    capacity: { configured: 100, committed: 94 },
  });

  results.noCapacityUnverified = await seedTenant({
    name: "Restaurante Sem Capacidade",
    category: "Restaurantes",
    priceCents: 3000,
    lat: -23.6,
    lng: -46.7,
    verified: false,
  });

  console.log(
    JSON.stringify(
      { ...results, discoveryUrl: "http://localhost:3000/loja" },
      null,
      2,
    ),
  );
  await db.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
