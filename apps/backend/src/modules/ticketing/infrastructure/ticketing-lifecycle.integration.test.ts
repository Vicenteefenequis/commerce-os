import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { sql } from "kysely";
import { db } from "../../../db/kysely.js";
import { env } from "../../../config/env.js";
import { OutboxEventPublisher } from "../../../events/outbox-publisher.js";
import { getOutboxConsumersFor } from "../../../events/outbox-consumer-registry.js";
import { registerAllConsumers } from "../../../worker/register-consumers.js";
import { KyselyProductRepository } from "../../catalog/infrastructure/product-repository.kysely.js";
import { KyselyResourceRepository } from "../../capacity/infrastructure/resource-repository.kysely.js";
import { KyselyCapacityCommitmentRepository } from "../../capacity/infrastructure/capacity-commitment-repository.kysely.js";
import { KyselyReservationRepository } from "../../capacity/infrastructure/reservation-repository.kysely.js";
import { KyselyCustomerRepository } from "../../customer/infrastructure/customer-repository.kysely.js";
import { CreateOrderUseCase } from "../../commerce/application/create-order.usecase.js";
import { TransitionOrderStatusUseCase } from "../../commerce/application/transition-order-status.usecase.js";
import { KyselyOrderRepository } from "../../commerce/infrastructure/order-repository.kysely.js";
import { ensureCheckoutSystemUserId } from "../../commerce/infrastructure/system-user.kysely.js";

/**
 * spec: ticketing/entitlement, ticketing/ticket, communication/ticket-delivery.
 * Requires a reachable Postgres, same skip-if-unreachable convention as
 * order-checkout.integration.test.ts.
 */
let dbReachable = true;

/**
 * This suite asserts on delivery outcome as a side effect of issuance,
 * not on which EmailProviderPort is selected (that's M10's concern,
 * covered by ticketing-outbox-consumer.test.ts). Force NullEmailProvider
 * selection regardless of a developer's real RESEND and SMTP env values
 * in their local .env, so this test stays deterministic instead of
 * depending on ambient environment state.
 */
let originalEmailEnv: Pick<typeof env, "resendApiKey" | "resendFromEmail" | "smtpHost">;

beforeEach(() => {
  originalEmailEnv = { resendApiKey: env.resendApiKey, resendFromEmail: env.resendFromEmail, smtpHost: env.smtpHost };
  env.resendApiKey = undefined;
  env.resendFromEmail = undefined;
  env.smtpHost = undefined;
});

afterEach(() => {
  Object.assign(env, originalEmailEnv);
});

beforeAll(async () => {
  try {
    await sql`select 1`.execute(db);
    registerAllConsumers();
  } catch {
    dbReachable = false;
  }
});

afterAll(async () => {
  if (dbReachable) {
    await db.destroy();
  }
});

async function seedTenant(name: string) {
  const tenantId = randomUUID();
  const venueId = randomUUID();

  await db.insertInto("organizations").values({ id: tenantId, name }).execute();
  await sql`select set_config('app.tenant_id', ${tenantId}, false)`.execute(db);
  await db.insertInto("venues").values({ id: venueId, tenant_id: tenantId, name: "Unidade" }).execute();

  const variantId = await db.transaction().execute(async (trx) => {
    await sql`select set_config('app.tenant_id', ${tenantId}, true)`.execute(trx);
    const product = await new KyselyProductRepository(trx).create({
      id: randomUUID(),
      tenantId,
      venueId,
      name: "Ingresso",
      variants: [{ id: randomUUID(), name: "Único", priceCents: 2000 }],
    });
    return product.variants[0]!.id;
  });

  return { tenantId, venueId, variantId };
}

async function checkoutAndPay(tenantId: string, venueId: string, variantId: string, quantity: number) {
  const order = await db.transaction().execute(async (trx) => {
    await sql`select set_config('app.tenant_id', ${tenantId}, true)`.execute(trx);
    const actorUserId = await ensureCheckoutSystemUserId(trx, tenantId);
    return new CreateOrderUseCase(
      new KyselyProductRepository(trx),
      new KyselyResourceRepository(trx),
      new KyselyCapacityCommitmentRepository(trx),
      new KyselyReservationRepository(trx),
      new KyselyOrderRepository(trx),
      new KyselyCustomerRepository(trx),
      new OutboxEventPublisher(trx),
    ).execute({
      tenantId,
      venueId,
      customer: { email: "ana@example.com", name: "Ana" },
      lines: [{ variantId, quantity }],
      idempotencyKey: null,
      holdExpiresAt: new Date(Date.now() + 900_000),
      actorUserId,
    });
  });

  async function transition(to: "awaiting_payment" | "paid") {
    await db.transaction().execute(async (trx) => {
      await sql`select set_config('app.tenant_id', ${tenantId}, true)`.execute(trx);
      const actorUserId = await ensureCheckoutSystemUserId(trx, tenantId);
      await new TransitionOrderStatusUseCase(new KyselyOrderRepository(trx), new OutboxEventPublisher(trx)).execute({
        tenantId,
        orderId: order.id,
        to,
        actorUserId,
      });
    });
  }
  await transition("awaiting_payment");
  await transition("paid");

  return order;
}

async function processOutbox(tenantId: string) {
  await sql`select set_config('app.tenant_id', ${tenantId}, false)`.execute(db);
  const pendingEvents = await db
    .selectFrom("outbox_events")
    .selectAll()
    .where("tenant_id", "=", tenantId)
    .where("processed_at", "is", null)
    .execute();
  for (const pending of pendingEvents) {
    await db.transaction().execute(async (trx) => {
      await sql`select set_config('app.tenant_id', ${pending.tenant_id}, true)`.execute(trx);
      for (const consumer of getOutboxConsumersFor(pending.event_type)) {
        await consumer(
          { id: pending.id, tenantId: pending.tenant_id, type: pending.event_type, payload: pending.payload },
          trx,
        );
      }
      await trx.updateTable("outbox_events").set({ processed_at: new Date() }).where("id", "=", pending.id).execute();
    });
  }
}

describe.skipIf(!dbReachable)("Ticketing lifecycle (live Postgres)", () => {
  it("issues one Entitlement and one Ticket per unit when an order is paid, and records a not_configured delivery", async () => {
    const { tenantId, venueId, variantId } = await seedTenant("Zoo Ticketing");
    const order = await checkoutAndPay(tenantId, venueId, variantId, 3);

    await processOutbox(tenantId);

    await sql`select set_config('app.tenant_id', ${tenantId}, false)`.execute(db);
    const entitlementRows = await db
      .selectFrom("entitlements")
      .selectAll()
      .where("order_id", "=", order.id)
      .execute();
    expect(entitlementRows).toHaveLength(3);
    expect(entitlementRows.every((r) => r.status === "issued")).toBe(true);

    const ticketRows = await db
      .selectFrom("tickets")
      .selectAll()
      .where(
        "entitlement_id",
        "in",
        entitlementRows.map((r) => r.id),
      )
      .execute();
    expect(ticketRows).toHaveLength(3);
    expect(new Set(ticketRows.map((r) => r.code)).size).toBe(3);

    const deliveryRows = await db
      .selectFrom("ticket_deliveries")
      .selectAll()
      .where("order_id", "=", order.id)
      .execute();
    expect(deliveryRows).toHaveLength(1);
    expect(deliveryRows[0]?.status).toBe("not_configured");
  });

  it("does not double-issue when the paid event is processed more than once", async () => {
    const { tenantId, venueId, variantId } = await seedTenant("Zoo Ticketing Idempotency");
    const order = await checkoutAndPay(tenantId, venueId, variantId, 2);

    await processOutbox(tenantId);

    // Re-run the same consumer directly a second time, simulating a
    // redelivered order.status_changed event (spec: "Entitlement issuance
    // is not duplicated").
    await db.transaction().execute(async (trx) => {
      await sql`select set_config('app.tenant_id', ${tenantId}, true)`.execute(trx);
      const actorUserId = await ensureCheckoutSystemUserId(trx, tenantId);
      for (const consumer of getOutboxConsumersFor("order.status_changed")) {
        await consumer(
          {
            id: randomUUID(),
            tenantId,
            type: "order.status_changed",
            payload: { orderId: order.id, fromStatus: "awaiting_payment", toStatus: "paid", actorUserId },
          },
          trx,
        );
      }
    });

    await sql`select set_config('app.tenant_id', ${tenantId}, false)`.execute(db);
    const entitlementRows = await db.selectFrom("entitlements").selectAll().where("order_id", "=", order.id).execute();
    expect(entitlementRows).toHaveLength(2);
    const deliveryRows = await db.selectFrom("ticket_deliveries").selectAll().where("order_id", "=", order.id).execute();
    expect(deliveryRows).toHaveLength(1);
  });

  it("rejects a second Ticket for the same Entitlement at the database level", async () => {
    const { tenantId, venueId, variantId } = await seedTenant("Zoo Ticketing Uniqueness");
    const order = await checkoutAndPay(tenantId, venueId, variantId, 1);
    await processOutbox(tenantId);

    await sql`select set_config('app.tenant_id', ${tenantId}, false)`.execute(db);
    const entitlement = await db
      .selectFrom("entitlements")
      .selectAll()
      .where("order_id", "=", order.id)
      .executeTakeFirstOrThrow();

    await expect(
      db
        .insertInto("tickets")
        .values({ id: randomUUID(), tenant_id: tenantId, entitlement_id: entitlement.id, code: randomUUID() })
        .execute(),
    ).rejects.toThrow();
  });

  it("does not let a request scoped to one tenant read another tenant's entitlements or tickets", async () => {
    const tenantA = await seedTenant("Zoo Ticketing A");
    const tenantB = await seedTenant("Zoo Ticketing B");
    const order = await checkoutAndPay(tenantA.tenantId, tenantA.venueId, tenantA.variantId, 1);
    await processOutbox(tenantA.tenantId);

    const entitlementRows = await db
      .selectFrom("entitlements")
      .selectAll()
      .where("tenant_id", "=", tenantB.tenantId)
      .where("order_id", "=", order.id)
      .execute();
    expect(entitlementRows).toHaveLength(0);
  });
});
