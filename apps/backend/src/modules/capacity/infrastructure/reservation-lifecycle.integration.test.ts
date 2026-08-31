import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { sql } from "kysely";
import { db } from "../../../db/kysely.js";
import { OutboxEventPublisher } from "../../../events/outbox-publisher.js";
import { getOutboxConsumersFor } from "../../../events/outbox-consumer-registry.js";
import { registerAllConsumers } from "../../../worker/register-consumers.js";
import { CreateReservationUseCase } from "../application/create-reservation.usecase.js";
import { ConfirmReservationUseCase } from "../application/confirm-reservation.usecase.js";
import { ExpireReservationUseCase } from "../application/expire-reservation.usecase.js";
import { CancelReservationUseCase } from "../application/cancel-reservation.usecase.js";
import { ConsumeReservationUseCase } from "../application/consume-reservation.usecase.js";
import { GetAvailableCapacityUseCase } from "../application/get-available-capacity.usecase.js";
import { KyselyResourceRepository } from "./resource-repository.kysely.js";
import { KyselyCapacityCommitmentRepository } from "./capacity-commitment-repository.kysely.js";
import { KyselyCapacityPeriodRepository } from "./capacity-period-repository.kysely.js";
import { KyselyReservationRepository } from "./reservation-repository.kysely.js";

/**
 * spec: capacity/reservation (full lifecycle, tenant isolation, audit);
 * capacity/resource (commitment release/consume). Requires a reachable
 * Postgres, same skip-if-unreachable convention as
 * commit-capacity.concurrency.test.ts (tasks.md 2.2-2.4, 4.1, 5.3, 6.1, 6.2).
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
  const actorUserId = randomUUID();

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
      default_capacity: 100,
      hard_capacity: true,
    })
    .execute();
  // audit_log.actor_user_id has a FK to users - the acting identity must be a real row.
  await db
    .insertInto("users")
    .values({ id: actorUserId, tenant_id: tenantId, email: `${actorUserId}@example.com`, password_hash: "x" })
    .execute();

  return { tenantId, venueId, resourceId, actorUserId };
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

describe.skipIf(!dbReachable)("Reservation lifecycle (live Postgres)", () => {
  it("walks create -> confirm -> consume, keeping capacity committed throughout", async () => {
    const { tenantId, resourceId, actorUserId } = await seedTenant("Zoo Lifecycle");
    const period = "2026-06-15";

    expect(await availableCapacity(tenantId, resourceId, period)).toBe(100);

    const reservationId = await db.transaction().execute(async (trx) => {
      await sql`select set_config('app.tenant_id', ${tenantId}, true)`.execute(trx);
      const useCase = new CreateReservationUseCase(
        new KyselyResourceRepository(trx),
        new KyselyCapacityCommitmentRepository(trx),
        new KyselyReservationRepository(trx),
        new OutboxEventPublisher(trx),
      );
      const reservation = await useCase.execute({
        tenantId,
        resourceId,
        period,
        amount: 30,
        expiresAt: new Date(Date.now() + 60_000),
        actorUserId,
      });
      return reservation.id;
    });

    expect(await availableCapacity(tenantId, resourceId, period)).toBe(70);

    await db.transaction().execute(async (trx) => {
      await sql`select set_config('app.tenant_id', ${tenantId}, true)`.execute(trx);
      await new ConfirmReservationUseCase(
        new KyselyReservationRepository(trx),
        new OutboxEventPublisher(trx),
      ).execute({ tenantId, reservationId, actorUserId });
    });

    expect(await availableCapacity(tenantId, resourceId, period)).toBe(70);

    await db.transaction().execute(async (trx) => {
      await sql`select set_config('app.tenant_id', ${tenantId}, true)`.execute(trx);
      await new ConsumeReservationUseCase(
        new KyselyReservationRepository(trx),
        new KyselyCapacityCommitmentRepository(trx),
        new OutboxEventPublisher(trx),
      ).execute({ tenantId, reservationId, actorUserId });
    });

    // Consumption is terminal: capacity remains committed (spec: capacity/resource - "Commitment consumption is permanent").
    expect(await availableCapacity(tenantId, resourceId, period)).toBe(70);

    await sql`select set_config('app.tenant_id', ${tenantId}, false)`.execute(db);
    const row = await db
      .selectFrom("reservations")
      .selectAll()
      .where("id", "=", reservationId)
      .executeTakeFirstOrThrow();
    expect(row.status).toBe("consumed");
  });

  it("frees capacity when a pending reservation expires, and when a confirmed one is cancelled", async () => {
    const { tenantId, resourceId, actorUserId } = await seedTenant("Zoo Side Exits");
    const period = "2026-07-01";

    async function createReservation(amount: number) {
      return db.transaction().execute(async (trx) => {
        await sql`select set_config('app.tenant_id', ${tenantId}, true)`.execute(trx);
        const useCase = new CreateReservationUseCase(
          new KyselyResourceRepository(trx),
          new KyselyCapacityCommitmentRepository(trx),
          new KyselyReservationRepository(trx),
          new OutboxEventPublisher(trx),
        );
        const reservation = await useCase.execute({
          tenantId,
          resourceId,
          period,
          amount,
          expiresAt: new Date(Date.now() + 60_000),
          actorUserId,
        });
        return reservation.id;
      });
    }

    // Expire side exit.
    const expiredId = await createReservation(20);
    expect(await availableCapacity(tenantId, resourceId, period)).toBe(80);
    await db.transaction().execute(async (trx) => {
      await sql`select set_config('app.tenant_id', ${tenantId}, true)`.execute(trx);
      await new ExpireReservationUseCase(
        new KyselyReservationRepository(trx),
        new KyselyCapacityCommitmentRepository(trx),
        new OutboxEventPublisher(trx),
      ).execute({ tenantId, reservationId: expiredId, actorUserId });
    });
    expect(await availableCapacity(tenantId, resourceId, period)).toBe(100);

    // Cancel side exit (after confirmation).
    const cancelledId = await createReservation(15);
    await db.transaction().execute(async (trx) => {
      await sql`select set_config('app.tenant_id', ${tenantId}, true)`.execute(trx);
      await new ConfirmReservationUseCase(
        new KyselyReservationRepository(trx),
        new OutboxEventPublisher(trx),
      ).execute({ tenantId, reservationId: cancelledId, actorUserId });
    });
    expect(await availableCapacity(tenantId, resourceId, period)).toBe(85);

    await db.transaction().execute(async (trx) => {
      await sql`select set_config('app.tenant_id', ${tenantId}, true)`.execute(trx);
      await new CancelReservationUseCase(
        new KyselyReservationRepository(trx),
        new KyselyCapacityCommitmentRepository(trx),
        new OutboxEventPublisher(trx),
      ).execute({ tenantId, reservationId: cancelledId, actorUserId });
    });
    expect(await availableCapacity(tenantId, resourceId, period)).toBe(100);

    // spec: capacity/reservation - "Reservation state transitions are
    // audited". Processes only this test's own pending events (scoped by
    // tenant_id), rather than draining the whole outbox: this Postgres
    // instance is shared across concurrent local dev/test sessions, and a
    // global drain would touch - and could fail on - unrelated data.
    await sql`select set_config('app.tenant_id', ${tenantId}, false)`.execute(db);
    const pendingEvents = await db
      .selectFrom("outbox_events")
      .selectAll()
      .where("tenant_id", "=", tenantId)
      .where("processed_at", "is", null)
      .execute();
    expect(pendingEvents.length).toBeGreaterThan(0);

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
    const auditRows = await db
      .selectFrom("audit_log")
      .selectAll()
      .where("tenant_id", "=", tenantId)
      .where("entity_id", "=", cancelledId)
      .where("action", "=", "reservation.cancelled")
      .execute();
    expect(auditRows).toHaveLength(1);
    expect(auditRows[0]?.actor_user_id).toBe(actorUserId);
  });

  it("does not let a request scoped to one tenant read or transition another tenant's reservation", async () => {
    const tenantA = await seedTenant("Zoo A");
    const tenantB = await seedTenant("Zoo B");
    const period = "2026-08-01";

    const reservationId = await db.transaction().execute(async (trx) => {
      await sql`select set_config('app.tenant_id', ${tenantA.tenantId}, true)`.execute(trx);
      const useCase = new CreateReservationUseCase(
        new KyselyResourceRepository(trx),
        new KyselyCapacityCommitmentRepository(trx),
        new KyselyReservationRepository(trx),
        new OutboxEventPublisher(trx),
      );
      const reservation = await useCase.execute({
        tenantId: tenantA.tenantId,
        resourceId: tenantA.resourceId,
        period,
        amount: 10,
        expiresAt: new Date(Date.now() + 60_000),
        actorUserId: tenantA.actorUserId,
      });
      return reservation.id;
    });

    await db.transaction().execute(async (trx) => {
      await sql`select set_config('app.tenant_id', ${tenantB.tenantId}, true)`.execute(trx);
      const reservations = new KyselyReservationRepository(trx);
      // The application always scopes repository calls to the caller's own
      // tenantId (from req.identity), never an id supplied by the request -
      // so a caller authenticated as tenantB simply cannot address tenantA's
      // reservation, regardless of which id it names (spec: capacity/reservation
      // - "Reservation is isolated by tenant").
      const found = await reservations.findById(tenantB.tenantId, reservationId);
      expect(found).toBeNull();

      const updated = await reservations.transitionStatus(tenantB.tenantId, reservationId, "pending", "confirmed");
      expect(updated).toBe(false);
    });
  });
});
