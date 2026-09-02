import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { sql } from "kysely";
import { db } from "../../../db/kysely.js";
import { KyselyEntitlementRepository } from "./entitlement-repository.kysely.js";

/**
 * spec: ticketing/entitlement - "Entitlement is consumed exactly once via
 * Access Control", "Concurrent scans on the same Entitlement resolve to a
 * single consumption". The single-consumption property is a genuine
 * concurrency guarantee of the guarded UPDATE (add-access-control
 * design.md D5) and can only be proven against a real Postgres, so this
 * mirrors commit-capacity.concurrency.test.ts, including its
 * skip-if-unreachable convention.
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

async function seedIssuedEntitlement(name: string) {
  const tenantId = randomUUID();
  const venueId = randomUUID();
  const customerId = randomUUID();
  const productId = randomUUID();
  const variantId = randomUUID();
  const orderId = randomUUID();
  const orderLineId = randomUUID();
  const entitlementId = randomUUID();

  await db.insertInto("organizations").values({ id: tenantId, name, slug: tenantId }).execute();
  await sql`select set_config('app.tenant_id', ${tenantId}, false)`.execute(db);

  await db.insertInto("venues").values({ id: venueId, tenant_id: tenantId, name: "Unidade", slug: venueId }).execute();
  await db
    .insertInto("customers")
    .values({ id: customerId, tenant_id: tenantId, email: `ana-${customerId}@example.com`, name: "Ana" })
    .execute();
  await db
    .insertInto("products")
    .values({ id: productId, tenant_id: tenantId, venue_id: venueId, name: "Ingresso" })
    .execute();
  await db
    .insertInto("product_variants")
    .values({ id: variantId, tenant_id: tenantId, product_id: productId, name: "Único", price_cents: 2000 })
    .execute();
  await db
    .insertInto("orders")
    .values({ id: orderId, tenant_id: tenantId, venue_id: venueId, customer_id: customerId, status: "paid" })
    .execute();
  await db
    .insertInto("order_lines")
    .values({
      id: orderLineId,
      tenant_id: tenantId,
      order_id: orderId,
      variant_id: variantId,
      name: "Ingresso",
      unit_price_cents: 2000,
      quantity: 1,
    })
    .execute();
  await db
    .insertInto("entitlements")
    .values({
      id: entitlementId,
      tenant_id: tenantId,
      order_id: orderId,
      order_line_id: orderLineId,
      customer_id: customerId,
      status: "issued",
    })
    .execute();

  return { tenantId, entitlementId };
}

function consumeInOwnTransaction(tenantId: string, entitlementId: string): Promise<boolean> {
  return db.transaction().execute(async (trx) => {
    await sql`select set_config('app.tenant_id', ${tenantId}, true)`.execute(trx);
    return new KyselyEntitlementRepository(trx).consume(tenantId, entitlementId);
  });
}

describe.skipIf(!dbReachable)("Entitlement consumption (live Postgres)", () => {
  it("consumes an issued Entitlement once and reports the second attempt as a no-op", async () => {
    const { tenantId, entitlementId } = await seedIssuedEntitlement("Zoo Consumo");

    const first = await consumeInOwnTransaction(tenantId, entitlementId);
    const second = await consumeInOwnTransaction(tenantId, entitlementId);

    expect(first).toBe(true);
    expect(second).toBe(false);

    await sql`select set_config('app.tenant_id', ${tenantId}, false)`.execute(db);
    const row = await db
      .selectFrom("entitlements")
      .selectAll()
      .where("id", "=", entitlementId)
      .executeTakeFirstOrThrow();
    expect(row.status).toBe("consumed");
  });

  it("resolves two concurrent consumptions of the same Entitlement to exactly one success", async () => {
    const { tenantId, entitlementId } = await seedIssuedEntitlement("Zoo Consumo Concorrente");

    const results = await Promise.all([
      consumeInOwnTransaction(tenantId, entitlementId),
      consumeInOwnTransaction(tenantId, entitlementId),
    ]);

    expect(results.filter((r) => r === true)).toHaveLength(1);
    expect(results.filter((r) => r === false)).toHaveLength(1);

    await sql`select set_config('app.tenant_id', ${tenantId}, false)`.execute(db);
    const row = await db
      .selectFrom("entitlements")
      .selectAll()
      .where("id", "=", entitlementId)
      .executeTakeFirstOrThrow();
    expect(row.status).toBe("consumed");
  });

  it("does not consume an Entitlement belonging to another tenant", async () => {
    const owner = await seedIssuedEntitlement("Zoo Consumo Dono");
    const other = await seedIssuedEntitlement("Zoo Consumo Outro");

    const consumed = await db.transaction().execute(async (trx) => {
      await sql`select set_config('app.tenant_id', ${other.tenantId}, true)`.execute(trx);
      return new KyselyEntitlementRepository(trx).consume(other.tenantId, owner.entitlementId);
    });

    expect(consumed).toBe(false);

    await sql`select set_config('app.tenant_id', ${owner.tenantId}, false)`.execute(db);
    const row = await db
      .selectFrom("entitlements")
      .selectAll()
      .where("id", "=", owner.entitlementId)
      .executeTakeFirstOrThrow();
    expect(row.status).toBe("issued");
  });
});
