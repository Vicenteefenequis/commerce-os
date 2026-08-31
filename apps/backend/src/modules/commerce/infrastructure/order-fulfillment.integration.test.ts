import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { sql } from "kysely";
import { db } from "../../../db/kysely.js";
import { OutboxEventPublisher } from "../../../events/outbox-publisher.js";
import { getOutboxConsumersFor } from "../../../events/outbox-consumer-registry.js";
import { registerAllConsumers } from "../../../worker/register-consumers.js";
import { KyselyProductRepository } from "../../catalog/infrastructure/product-repository.kysely.js";
import { KyselyResourceRepository } from "../../capacity/infrastructure/resource-repository.kysely.js";
import { KyselyCapacityCommitmentRepository } from "../../capacity/infrastructure/capacity-commitment-repository.kysely.js";
import { KyselyCapacityPeriodRepository } from "../../capacity/infrastructure/capacity-period-repository.kysely.js";
import { KyselyReservationRepository } from "../../capacity/infrastructure/reservation-repository.kysely.js";
import { GetAvailableCapacityUseCase } from "../../capacity/application/get-available-capacity.usecase.js";
import { ConfirmReservationUseCase } from "../../capacity/application/confirm-reservation.usecase.js";
import { CreateOrderUseCase } from "../application/create-order.usecase.js";
import { TransitionOrderStatusUseCase } from "../application/transition-order-status.usecase.js";
import { FulfillOrderUseCase } from "../application/fulfill-order.usecase.js";
import { InvalidOrderTransitionError } from "../application/order-errors.js";
import { KyselyCustomerRepository } from "../../customer/infrastructure/customer-repository.kysely.js";
import { KyselyOrderRepository } from "./order-repository.kysely.js";
import { ensureCheckoutSystemUserId } from "./system-user.kysely.js";

/**
 * spec: commerce/fulfillment (fulfillment, capacity consumption, audit,
 * tenant isolation); payments/payment - "Payment confirms held
 * reservations". Requires a reachable Postgres, same skip-if-unreachable
 * convention as order-checkout.integration.test.ts.
 */
let dbReachable = true;

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
  const resourceId = randomUUID();

  await db.insertInto("organizations").values({ id: tenantId, name }).execute();
  await sql`select set_config('app.tenant_id', ${tenantId}, false)`.execute(db);
  await db.insertInto("venues").values({ id: venueId, tenant_id: tenantId, name: "Unidade" }).execute();
  await db
    .insertInto("resources")
    .values({
      id: resourceId,
      tenant_id: tenantId,
      venue_id: venueId,
      name: "Portão",
      default_capacity: 10,
      hard_capacity: true,
    })
    .execute();

  const bookedVariantId = await db.transaction().execute(async (trx) => {
    await sql`select set_config('app.tenant_id', ${tenantId}, true)`.execute(trx);
    const product = await new KyselyProductRepository(trx).create({
      id: randomUUID(),
      tenantId,
      venueId,
      name: "Ingresso",
      variants: [{ id: randomUUID(), name: "Adulto", priceCents: 5000, resourceId }],
    });
    return product.variants[0]!.id;
  });

  return { tenantId, venueId, resourceId, bookedVariantId };
}

async function availableCapacity(tenantId: string, resourceId: string, period: string): Promise<number> {
  return db.transaction().execute(async (trx) => {
    await sql`select set_config('app.tenant_id', ${tenantId}, true)`.execute(trx);
    return new GetAvailableCapacityUseCase(new KyselyCapacityPeriodRepository(trx)).execute(
      tenantId,
      resourceId,
      period,
    );
  });
}

async function checkout(
  tenantId: string,
  venueId: string,
  lines: Array<{ variantId: string; quantity: number; period?: string }>,
) {
  return db.transaction().execute(async (trx) => {
    await sql`select set_config('app.tenant_id', ${tenantId}, true)`.execute(trx);
    const actorUserId = await ensureCheckoutSystemUserId(trx, tenantId);
    const useCase = new CreateOrderUseCase(
      new KyselyProductRepository(trx),
      new KyselyResourceRepository(trx),
      new KyselyCapacityCommitmentRepository(trx),
      new KyselyReservationRepository(trx),
      new KyselyOrderRepository(trx),
      new KyselyCustomerRepository(trx),
      new OutboxEventPublisher(trx),
    );
    return useCase.execute({
      tenantId,
      venueId,
      customer: { email: "ana@example.com", name: "Ana" },
      lines,
      idempotencyKey: null,
      holdExpiresAt: new Date(Date.now() + 900_000),
      actorUserId,
    });
  });
}

/** Drives an order to `paid` and confirms its reservations, mirroring what the Stripe webhook now does (spec: payments/payment - "Payment confirms held reservations"). */
async function payAndConfirm(tenantId: string, orderId: string) {
  await db.transaction().execute(async (trx) => {
    await sql`select set_config('app.tenant_id', ${tenantId}, true)`.execute(trx);
    const actorUserId = await ensureCheckoutSystemUserId(trx, tenantId);
    await new TransitionOrderStatusUseCase(new KyselyOrderRepository(trx), new OutboxEventPublisher(trx)).execute({
      tenantId,
      orderId,
      to: "awaiting_payment",
      actorUserId,
    });
    await new TransitionOrderStatusUseCase(new KyselyOrderRepository(trx), new OutboxEventPublisher(trx)).execute({
      tenantId,
      orderId,
      to: "paid",
      actorUserId,
    });
    const order = await new KyselyOrderRepository(trx).findById(tenantId, orderId);
    const confirmReservation = new ConfirmReservationUseCase(
      new KyselyReservationRepository(trx),
      new OutboxEventPublisher(trx),
    );
    for (const line of order?.lines ?? []) {
      if (line.reservationId) {
        await confirmReservation.execute({ tenantId, reservationId: line.reservationId, actorUserId });
      }
    }
  });
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

describe.skipIf(!dbReachable)("Order fulfillment (live Postgres)", () => {
  it("fulfills a paid order, consumes its reservation, and keeps capacity committed", async () => {
    const { tenantId, venueId, resourceId, bookedVariantId } = await seedTenant("Zoo Fulfillment");
    const period = "2026-08-01";

    const order = await checkout(tenantId, venueId, [{ variantId: bookedVariantId, quantity: 2, period }]);
    await payAndConfirm(tenantId, order.id);
    expect(await availableCapacity(tenantId, resourceId, period)).toBe(8);

    await db.transaction().execute(async (trx) => {
      await sql`select set_config('app.tenant_id', ${tenantId}, true)`.execute(trx);
      const actorUserId = await ensureCheckoutSystemUserId(trx, tenantId);
      await new FulfillOrderUseCase(
        new KyselyOrderRepository(trx),
        new KyselyReservationRepository(trx),
        new KyselyCapacityCommitmentRepository(trx),
        new OutboxEventPublisher(trx),
      ).execute({ tenantId, orderId: order.id, actorUserId });
    });

    expect(await availableCapacity(tenantId, resourceId, period)).toBe(8);

    await sql`select set_config('app.tenant_id', ${tenantId}, false)`.execute(db);
    const orderRow = await db.selectFrom("orders").selectAll().where("id", "=", order.id).executeTakeFirstOrThrow();
    expect(orderRow.status).toBe("fulfilled");
    const reservationRow = await db
      .selectFrom("reservations")
      .selectAll()
      .where("id", "=", order.lines[0]!.reservationId!)
      .executeTakeFirstOrThrow();
    expect(reservationRow.status).toBe("consumed");

    await processOutbox(tenantId);
    await sql`select set_config('app.tenant_id', ${tenantId}, false)`.execute(db);
    const auditRows = await db
      .selectFrom("audit_log")
      .selectAll()
      .where("tenant_id", "=", tenantId)
      .where("entity_id", "=", order.id)
      .where("action", "=", "order.fulfilled")
      .execute();
    expect(auditRows).toHaveLength(1);
  });

  it("rejects fulfilling an order that is not paid", async () => {
    const { tenantId, venueId, bookedVariantId } = await seedTenant("Zoo Fulfillment Reject");
    const order = await checkout(tenantId, venueId, [
      { variantId: bookedVariantId, quantity: 1, period: "2026-08-02" },
    ]);

    await expect(
      db.transaction().execute(async (trx) => {
        await sql`select set_config('app.tenant_id', ${tenantId}, true)`.execute(trx);
        const actorUserId = await ensureCheckoutSystemUserId(trx, tenantId);
        return new FulfillOrderUseCase(
          new KyselyOrderRepository(trx),
          new KyselyReservationRepository(trx),
          new KyselyCapacityCommitmentRepository(trx),
          new OutboxEventPublisher(trx),
        ).execute({ tenantId, orderId: order.id, actorUserId });
      }),
    ).rejects.toBeInstanceOf(InvalidOrderTransitionError);
  });

  it("does not let a request scoped to one tenant fulfill another tenant's order", async () => {
    const tenantA = await seedTenant("Zoo A Fulfillment");
    const tenantB = await seedTenant("Zoo B Fulfillment");

    const order = await checkout(tenantA.tenantId, tenantA.venueId, [
      { variantId: tenantA.bookedVariantId, quantity: 1, period: "2026-08-03" },
    ]);
    await payAndConfirm(tenantA.tenantId, order.id);

    await db.transaction().execute(async (trx) => {
      await sql`select set_config('app.tenant_id', ${tenantB.tenantId}, true)`.execute(trx);
      const orders = new KyselyOrderRepository(trx);
      const found = await orders.findById(tenantB.tenantId, order.id);
      expect(found).toBeNull();

      const updated = await orders.transitionStatus(tenantB.tenantId, order.id, "paid", "fulfilled");
      expect(updated).toBe(false);
    });
  });
});
