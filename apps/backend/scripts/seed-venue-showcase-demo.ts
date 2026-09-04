import { randomUUID } from "node:crypto";
import argon2 from "argon2";
import { sql } from "kysely";
import { db } from "../src/db/kysely.js";

/**
 * Seeds one Organization with an owner login, a Venue with a full
 * showcase profile (published + photo + active Product), and a second
 * unpublished sibling Venue - everything needed to manually exercise
 * admin/venues, /vitrine, and /busca (add-venue-showcase-and-search).
 */
async function main() {
  const tenantId = randomUUID();
  const userId = randomUUID();
  const publishedVenueId = randomUUID();
  const unpublishedVenueId = randomUUID();
  const productId = randomUUID();
  const variantId = randomUUID();

  const tenantSlug = `bar-do-ze-${tenantId.slice(0, 8)}`;
  const publishedVenueSlug = "unidade-centro";
  const unpublishedVenueSlug = "unidade-rascunho";
  const email = "owner@example.com";
  const password = "supersecret123";

  await db.insertInto("organizations").values({ id: tenantId, name: "Bar do Zé", slug: tenantSlug }).execute();
  await sql`select set_config('app.tenant_id', ${tenantId}, false)`.execute(db);

  await db
    .insertInto("users")
    .values({ id: userId, tenant_id: tenantId, email, password_hash: await argon2.hash(password) })
    .execute();
  await db
    .insertInto("role_assignments")
    .values({ id: randomUUID(), tenant_id: tenantId, user_id: userId, role: "owner" })
    .execute();

  await db
    .insertInto("venues")
    .values({
      id: publishedVenueId,
      tenant_id: tenantId,
      name: "Bar do Zé - Unidade Centro",
      slug: publishedVenueSlug,
      description: "O point mais tradicional da cidade, com música ao vivo toda sexta.",
      address: "Rua das Flores, 100",
      city: "São Paulo",
      category: "Bar",
      cover_photo_url: "https://images.unsplash.com/photo-1514933651103-005eec06c04b",
      published: true,
    })
    .execute();

  await db
    .insertInto("venues")
    .values({
      id: unpublishedVenueId,
      tenant_id: tenantId,
      name: "Bar do Zé - Unidade Rascunho",
      slug: unpublishedVenueSlug,
    })
    .execute();

  await db
    .insertInto("products")
    .values({ id: productId, tenant_id: tenantId, venue_id: publishedVenueId, name: "Ingresso Show ao Vivo", channels: [] })
    .execute();
  await db
    .insertInto("product_variants")
    .values({ id: variantId, tenant_id: tenantId, product_id: productId, name: "Inteira", price_cents: 5000 })
    .execute();

  console.log(
    JSON.stringify(
      {
        login: { tenantId, email, password, url: "http://localhost:3000/admin/login" },
        publishedVenue: { url: `http://localhost:3000/vitrine/${tenantSlug}/${publishedVenueSlug}` },
        unpublishedVenue: { url: `http://localhost:3000/vitrine/${tenantSlug}/${unpublishedVenueSlug}` },
        search: { url: "http://localhost:3000/busca" },
      },
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
