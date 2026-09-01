import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { sql } from "kysely";
import request from "supertest";
import { PNG } from "pngjs";
import jsQRImport from "jsqr";
import { createApp } from "../../../http/app.js";
import { db } from "../../../db/kysely.js";

// jsqr's CJS build and its .d.ts disagree on the default-export shape under
// NodeNext resolution; the runtime value is the callable function either way.
const jsQR = jsQRImport as unknown as (
  data: Uint8ClampedArray,
  width: number,
  height: number,
) => { data: string } | null;

/**
 * spec: ticketing/ticket - "Tickets for a paid Order can be listed
 * account-less", "Ticket code can be rendered as a QR image". Requires
 * a reachable Postgres; skips itself when unreachable, same convention
 * as access/scan.routes.test.ts.
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

async function seedOrderWithTickets(name: string, codeLabels: string[]) {
  const tenantId = randomUUID();
  const venueId = randomUUID();
  const customerId = randomUUID();
  const productId = randomUUID();
  const variantId = randomUUID();
  const orderId = randomUUID();
  const orderLineId = randomUUID();
  const ticketCodes = codeLabels.map((label) => `${label}-${randomUUID()}`);

  await db.insertInto("organizations").values({ id: tenantId, name }).execute();
  await sql`select set_config('app.tenant_id', ${tenantId}, false)`.execute(db);

  await db.insertInto("venues").values({ id: venueId, tenant_id: tenantId, name: "Unidade" }).execute();
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
      quantity: ticketCodes.length,
    })
    .execute();

  const ticketIds: string[] = [];
  for (const code of ticketCodes) {
    const entitlementId = randomUUID();
    const ticketId = randomUUID();
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
    await db
      .insertInto("tickets")
      .values({ id: ticketId, tenant_id: tenantId, entitlement_id: entitlementId, code })
      .execute();
    ticketIds.push(ticketId);
  }

  return { tenantId, orderId, ticketIds, ticketCodes };
}

function decodeQr(png: Buffer): string | undefined {
  const image = PNG.sync.read(png);
  return jsQR(new Uint8ClampedArray(image.data), image.width, image.height)?.data;
}

describe.skipIf(!dbReachable)("GET /orders/:orderId/tickets (live Postgres)", () => {
  it("returns every Ticket issued for the Order", async () => {
    const seed = await seedOrderWithTickets("Zoo Tickets Listagem", ["code-um", "code-dois"]);

    const res = await request(createApp()).get(`/orders/${seed.orderId}/tickets`).query({ tenantId: seed.tenantId });

    expect(res.status).toBe(200);
    expect(res.body.tickets.map((t: { code: string }) => t.code).sort()).toEqual([...seed.ticketCodes].sort());
  });

  it("returns an empty list for a tenant that does not own the Order", async () => {
    const seed = await seedOrderWithTickets("Zoo Tickets Tenant Errado", ["code-tenant-a"]);

    const res = await request(createApp()).get(`/orders/${seed.orderId}/tickets`).query({ tenantId: randomUUID() });

    expect(res.status).toBe(200);
    expect(res.body.tickets).toEqual([]);
  });

  it("returns an empty list for a nonexistent Order", async () => {
    const res = await request(createApp()).get(`/orders/${randomUUID()}/tickets`).query({ tenantId: randomUUID() });

    expect(res.status).toBe(200);
    expect(res.body.tickets).toEqual([]);
  });

  it("requires a tenantId", async () => {
    const res = await request(createApp()).get(`/orders/${randomUUID()}/tickets`);
    expect(res.status).toBe(400);
  });
});

describe.skipIf(!dbReachable)("GET /tickets/:ticketId/qrcode (live Postgres)", () => {
  it("returns a QR image that decodes to the Ticket's code", async () => {
    const seed = await seedOrderWithTickets("Zoo Tickets QR", ["code-qr-abc"]);

    const res = await request(createApp())
      .get(`/tickets/${seed.ticketIds[0]}/qrcode`)
      .query({ tenantId: seed.tenantId });

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe("image/png");
    expect(decodeQr(res.body)).toBe(seed.ticketCodes[0]);
  });

  it("returns 404 for the right ticket id under the wrong tenant", async () => {
    const seed = await seedOrderWithTickets("Zoo Tickets QR Tenant Errado", ["code-qr-def"]);

    const res = await request(createApp())
      .get(`/tickets/${seed.ticketIds[0]}/qrcode`)
      .query({ tenantId: randomUUID() });

    expect(res.status).toBe(404);
  });

  it("returns 404 for an unknown ticket id", async () => {
    const res = await request(createApp()).get(`/tickets/${randomUUID()}/qrcode`).query({ tenantId: randomUUID() });
    expect(res.status).toBe(404);
  });

  it("requires a tenantId", async () => {
    const res = await request(createApp()).get(`/tickets/${randomUUID()}/qrcode`);
    expect(res.status).toBe(400);
  });
});
