import { randomUUID } from "node:crypto";
import { sql } from "kysely";
import { db } from "../src/db/kysely.js";

async function main() {
  const tenantId = randomUUID();
  const venueId = randomUUID();
  const resourceId = randomUUID();
  const productId = randomUUID();
  const variantId = randomUUID();

  const tenantSlug = `zoo-teste-storefront-${tenantId.slice(0, 8)}`;
  const venueSlug = "unidade-teste";

  await db
    .insertInto("organizations")
    .values({ id: tenantId, name: "Zoo Teste Storefront", slug: tenantSlug })
    .execute();
  await sql`select set_config('app.tenant_id', ${tenantId}, false)`.execute(db);

  await db
    .insertInto("venues")
    .values({ id: venueId, tenant_id: tenantId, name: "Unidade Teste", slug: venueSlug })
    .execute();

  await db
    .insertInto("resources")
    .values({
      id: resourceId,
      tenant_id: tenantId,
      venue_id: venueId,
      name: "Trilha Guiada",
      default_capacity: 30,
      hard_capacity: true,
    })
    .execute();

  await db
    .insertInto("products")
    .values({
      id: productId,
      tenant_id: tenantId,
      venue_id: venueId,
      name: "Ingresso Trilha",
      channels: [],
    })
    .execute();

  await db
    .insertInto("product_variants")
    .values({
      id: variantId,
      tenant_id: tenantId,
      product_id: productId,
      name: "Inteira",
      price_cents: 4500,
      resource_id: resourceId,
    })
    .execute();

  console.log(
    JSON.stringify({ tenantId, tenantSlug, venueId, venueSlug, resourceId, productId, variantId }, null, 2),
  );
  await db.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
