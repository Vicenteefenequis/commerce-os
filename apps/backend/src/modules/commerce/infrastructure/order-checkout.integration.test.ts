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
import { KyselyCustomerRepository } from "../../customer/infrastructure/customer-repository.kysely.js";
import { CreateOrderUseCase } from "../application/create-order.usecase.js";
import { TransitionOrderStatusUseCase } from "../application/transition-order-status.usecase.js";
import { CancelOrderUseCase } from "../application/cancel-order.usecase.js";
import { KyselyOrderRepository } from "./order-repository.kysely.js";
import { ensureCheckoutSystemUserId } from "./system-user.kysely.js";

/**
 * spec: commerce/order (full lifecycle, cancellation, tenant isolation);
 * commerce/checkout (server-side pricing, capacity, duplicate prevention).
 * Requires a reachable Postgres, same skip-if-unreachable convention as
 * reservation-lifecycle.integration.test.ts (tasks.md 5.1-5.3).
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
  const staffUserId = randomUUID();

  await db.insertInto("organizations").values({ id: tenantId, name, slug: tenantId }).execute();
  await sql`select set_config('app.tenant_id', ${tenantId}, false)`.execute(db);
  await db.insertInto("venues").values({ id: venueId, tenant_id: tenantId, name: "Unidade", slug: venueId }).execute();
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
  await db
    .insertInto("users")
    .values({ id: staffUserId, tenant_id: tenantId, email: `${staffUserId}@example.com`, password_hash: "x" })
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

  const freeVariantId = await db.transaction().execute(async (trx) => {
    await sql`select set_config('app.tenant_id', ${tenantId}, true)`.execute(trx);
    const product = await new KyselyProductRepository(trx).create({
      id: randomUUID(),
      tenantId,
      venueId,
      name: "Camiseta",
      variants: [{ id: randomUUID(), name: "Único", priceCents: 3000 }],
    });
    return product.variants[0]!.id;
  });

  return { tenantId, venueId, resourceId, staffUserId, bookedVariantId, freeVariantId };
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
  idempotencyKey?: string,
  customer: { email: string; name: string } = { email: "ana@example.com", name: "Ana" },
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
      customer,
      lines,
      idempotencyKey: idempotencyKey ?? null,
      holdExpiresAt: new Date(Date.now() + 900_000),
      actorUserId,
    });
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

describe.skipIf(!dbReachable)("Order/checkout lifecycle (live Postgres)", () => {
  it("walks checkout -> paid -> fulfilled, holding capacity throughout", async () => {
    const { tenantId, venueId, resourceId, bookedVariantId, freeVariantId } = await seedTenant("Zoo Checkout");
    const period = "2026-06-15";

    expect(await availableCapacity(tenantId, resourceId, period)).toBe(10);

    const order = await checkout(tenantId, venueId, [
      { variantId: bookedVariantId, quantity: 3, period },
      { variantId: freeVariantId, quantity: 2 },
    ]);

    expect(order.status).toBe("draft");
    expect(order.lines).toHaveLength(2);
    const bookedLine = order.lines.find((l) => l.variantId === bookedVariantId);
    expect(bookedLine?.reservationId).toBeTruthy();
    expect(order.lines.find((l) => l.variantId === freeVariantId)?.reservationId).toBeNull();
    expect(await availableCapacity(tenantId, resourceId, period)).toBe(7);

    async function transition(orderId: string, to: "awaiting_payment" | "paid" | "fulfilled") {
      await db.transaction().execute(async (trx) => {
        await sql`select set_config('app.tenant_id', ${tenantId}, true)`.execute(trx);
        const actorUserId = await ensureCheckoutSystemUserId(trx, tenantId);
        await new TransitionOrderStatusUseCase(
          new KyselyOrderRepository(trx),
          new OutboxEventPublisher(trx),
        ).execute({ tenantId, orderId, to, actorUserId });
      });
    }

    await transition(order.id, "awaiting_payment");
    await transition(order.id, "paid");
    await transition(order.id, "fulfilled");

    expect(await availableCapacity(tenantId, resourceId, period)).toBe(7);

    await sql`select set_config('app.tenant_id', ${tenantId}, false)`.execute(db);
    const row = await db.selectFrom("orders").selectAll().where("id", "=", order.id).executeTakeFirstOrThrow();
    expect(row.status).toBe("fulfilled");
  });

  it("cancels an order, releases its reservation's capacity, and audits the cancellation", async () => {
    const { tenantId, venueId, resourceId, bookedVariantId } = await seedTenant("Zoo Cancel");
    const period = "2026-07-01";

    const order = await checkout(tenantId, venueId, [{ variantId: bookedVariantId, quantity: 4, period }]);
    expect(await availableCapacity(tenantId, resourceId, period)).toBe(6);

    await db.transaction().execute(async (trx) => {
      await sql`select set_config('app.tenant_id', ${tenantId}, true)`.execute(trx);
      const actorUserId = await ensureCheckoutSystemUserId(trx, tenantId);
      await new CancelOrderUseCase(
        new KyselyOrderRepository(trx),
        new KyselyReservationRepository(trx),
        new KyselyCapacityCommitmentRepository(trx),
        new OutboxEventPublisher(trx),
      ).execute({ tenantId, orderId: order.id, actorUserId });
    });

    expect(await availableCapacity(tenantId, resourceId, period)).toBe(10);

    await sql`select set_config('app.tenant_id', ${tenantId}, false)`.execute(db);
    const orderRow = await db.selectFrom("orders").selectAll().where("id", "=", order.id).executeTakeFirstOrThrow();
    expect(orderRow.status).toBe("cancelled");
    const reservationRow = await db
      .selectFrom("reservations")
      .selectAll()
      .where("id", "=", order.lines[0]!.reservationId!)
      .executeTakeFirstOrThrow();
    expect(reservationRow.status).toBe("cancelled");

    await processOutbox(tenantId);

    await sql`select set_config('app.tenant_id', ${tenantId}, false)`.execute(db);
    const auditRows = await db
      .selectFrom("audit_log")
      .selectAll()
      .where("tenant_id", "=", tenantId)
      .where("entity_id", "=", order.id)
      .where("action", "=", "order.cancelled")
      .execute();
    expect(auditRows).toHaveLength(1);
  });

  it("returns the same order for a retried checkout submission with the same idempotency key", async () => {
    const { tenantId, venueId, freeVariantId } = await seedTenant("Zoo Idempotency");
    const idempotencyKey = randomUUID();

    const first = await checkout(tenantId, venueId, [{ variantId: freeVariantId, quantity: 1 }], idempotencyKey);
    const second = await checkout(tenantId, venueId, [{ variantId: freeVariantId, quantity: 1 }], idempotencyKey);

    expect(second.id).toBe(first.id);

    await sql`select set_config('app.tenant_id', ${tenantId}, false)`.execute(db);
    const orderRows = await db.selectFrom("orders").selectAll().where("tenant_id", "=", tenantId).execute();
    expect(orderRows).toHaveLength(1);
  });

  it("does not let a request scoped to one tenant read or cancel another tenant's order", async () => {
    const tenantA = await seedTenant("Zoo A Orders");
    const tenantB = await seedTenant("Zoo B Orders");

    const order = await checkout(tenantA.tenantId, tenantA.venueId, [
      { variantId: tenantA.freeVariantId, quantity: 1 },
    ]);

    await db.transaction().execute(async (trx) => {
      await sql`select set_config('app.tenant_id', ${tenantB.tenantId}, true)`.execute(trx);
      const orders = new KyselyOrderRepository(trx);
      const found = await orders.findById(tenantB.tenantId, order.id);
      expect(found).toBeNull();

      const updated = await orders.transitionStatus(tenantB.tenantId, order.id, "draft", "cancelled");
      expect(updated).toBe(false);
    });
  });
});
