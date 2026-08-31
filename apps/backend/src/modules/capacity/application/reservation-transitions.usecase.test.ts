import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { ConfirmReservationUseCase } from "./confirm-reservation.usecase.js";
import { ExpireReservationUseCase } from "./expire-reservation.usecase.js";
import { CancelReservationUseCase } from "./cancel-reservation.usecase.js";
import { ConsumeReservationUseCase } from "./consume-reservation.usecase.js";
import { InvalidReservationTransitionError, ReservationNotFoundError } from "./reservation-errors.js";
import { Reservation, type ReservationStatus } from "../domain/reservation.entity.js";
import type {
  CapacityCommitmentRepositoryPort,
  ReservationRepositoryPort,
} from "../domain/ports.js";
import type { DomainEvent } from "../../../events/domain-event.js";
import type { EventPublisherPort } from "../../../shared-kernel/ports.js";
import {
  RESERVATION_CANCELLED,
  RESERVATION_CONFIRMED,
  RESERVATION_CONSUMED,
  RESERVATION_EXPIRED,
} from "../domain/events.js";

class FakeReservationRepository implements ReservationRepositoryPort {
  private reservation: Reservation | null;
  constructor(reservation: Reservation | null) {
    this.reservation = reservation;
  }
  async create(): Promise<Reservation> {
    throw new Error("not used in this test");
  }
  async findById(tenantId: string, id: string): Promise<Reservation | null> {
    if (!this.reservation || this.reservation.tenantId !== tenantId || this.reservation.id !== id) return null;
    return this.reservation;
  }
  async transitionStatus(
    tenantId: string,
    id: string,
    from: ReservationStatus | ReservationStatus[],
    to: ReservationStatus,
  ): Promise<boolean> {
    if (!this.reservation || this.reservation.tenantId !== tenantId || this.reservation.id !== id) return false;
    const fromStatuses = Array.isArray(from) ? from : [from];
    if (!fromStatuses.includes(this.reservation.status)) return false;
    this.reservation = Reservation.create({
      id: this.reservation.id,
      tenantId: this.reservation.tenantId,
      resourceId: this.reservation.resourceId,
      period: this.reservation.period,
      amount: this.reservation.amount,
      status: to,
      commitmentId: this.reservation.commitmentId,
      expiresAt: this.reservation.expiresAt,
    });
    return true;
  }
}

class FakeCommitmentRepository implements CapacityCommitmentRepositoryPort {
  public released: string[] = [];
  public consumed: string[] = [];
  async tryCommit(): Promise<{ id: string } | null> {
    throw new Error("not used in this test");
  }
  async releaseCommitment(_tenantId: string, id: string): Promise<boolean> {
    this.released.push(id);
    return true;
  }
  async markConsumed(_tenantId: string, id: string): Promise<boolean> {
    this.consumed.push(id);
    return true;
  }
}

class FakeEventPublisher implements EventPublisherPort {
  public published: DomainEvent[] = [];
  async publish(events: DomainEvent[]): Promise<void> {
    this.published.push(...events);
  }
}

function makeReservation(status: ReservationStatus, tenantId: string, commitmentId: string): Reservation {
  return Reservation.create({
    id: randomUUID(),
    tenantId,
    resourceId: randomUUID(),
    period: "2026-06-15",
    amount: 5,
    status,
    commitmentId,
    expiresAt: new Date(Date.now() + 60_000),
  });
}

describe("ConfirmReservationUseCase", () => {
  const tenantId = randomUUID();

  it("confirms a pending reservation", async () => {
    const reservation = makeReservation("pending", tenantId, randomUUID());
    const reservations = new FakeReservationRepository(reservation);
    const publisher = new FakeEventPublisher();
    await new ConfirmReservationUseCase(reservations, publisher).execute({
      tenantId,
      reservationId: reservation.id,
      actorUserId: randomUUID(),
    });
    expect(publisher.published[0]?.type).toBe(RESERVATION_CONFIRMED);
  });

  it("rejects confirming a non-pending reservation", async () => {
    const reservation = makeReservation("confirmed", tenantId, randomUUID());
    const reservations = new FakeReservationRepository(reservation);
    await expect(
      new ConfirmReservationUseCase(reservations, new FakeEventPublisher()).execute({
        tenantId,
        reservationId: reservation.id,
        actorUserId: randomUUID(),
      }),
    ).rejects.toBeInstanceOf(InvalidReservationTransitionError);
  });

  it("reports not found for an unknown reservation", async () => {
    const reservations = new FakeReservationRepository(null);
    await expect(
      new ConfirmReservationUseCase(reservations, new FakeEventPublisher()).execute({
        tenantId,
        reservationId: randomUUID(),
        actorUserId: randomUUID(),
      }),
    ).rejects.toBeInstanceOf(ReservationNotFoundError);
  });
});

describe("ExpireReservationUseCase", () => {
  const tenantId = randomUUID();

  it("expires a pending reservation and releases its commitment", async () => {
    const commitmentId = randomUUID();
    const reservation = makeReservation("pending", tenantId, commitmentId);
    const reservations = new FakeReservationRepository(reservation);
    const commitments = new FakeCommitmentRepository();
    const publisher = new FakeEventPublisher();

    await new ExpireReservationUseCase(reservations, commitments, publisher).execute({
      tenantId,
      reservationId: reservation.id,
      actorUserId: randomUUID(),
    });

    expect(commitments.released).toEqual([commitmentId]);
    expect(publisher.published[0]?.type).toBe(RESERVATION_EXPIRED);
  });

  it("rejects expiring a confirmed reservation", async () => {
    const reservation = makeReservation("confirmed", tenantId, randomUUID());
    const reservations = new FakeReservationRepository(reservation);
    const commitments = new FakeCommitmentRepository();

    await expect(
      new ExpireReservationUseCase(reservations, commitments, new FakeEventPublisher()).execute({
        tenantId,
        reservationId: reservation.id,
        actorUserId: randomUUID(),
      }),
    ).rejects.toBeInstanceOf(InvalidReservationTransitionError);
    expect(commitments.released).toHaveLength(0);
  });
});

describe("CancelReservationUseCase", () => {
  const tenantId = randomUUID();

  it("cancels a confirmed reservation and releases its commitment", async () => {
    const commitmentId = randomUUID();
    const reservation = makeReservation("confirmed", tenantId, commitmentId);
    const reservations = new FakeReservationRepository(reservation);
    const commitments = new FakeCommitmentRepository();
    const publisher = new FakeEventPublisher();

    await new CancelReservationUseCase(reservations, commitments, publisher).execute({
      tenantId,
      reservationId: reservation.id,
      actorUserId: randomUUID(),
    });

    expect(commitments.released).toEqual([commitmentId]);
    expect(publisher.published[0]?.type).toBe(RESERVATION_CANCELLED);
  });

  it("rejects cancelling an already consumed reservation", async () => {
    const reservation = makeReservation("consumed", tenantId, randomUUID());
    const reservations = new FakeReservationRepository(reservation);
    const commitments = new FakeCommitmentRepository();

    await expect(
      new CancelReservationUseCase(reservations, commitments, new FakeEventPublisher()).execute({
        tenantId,
        reservationId: reservation.id,
        actorUserId: randomUUID(),
      }),
    ).rejects.toBeInstanceOf(InvalidReservationTransitionError);
    expect(commitments.released).toHaveLength(0);
  });
});

describe("ConsumeReservationUseCase", () => {
  const tenantId = randomUUID();

  it("consumes a confirmed reservation and marks its commitment consumed", async () => {
    const commitmentId = randomUUID();
    const reservation = makeReservation("confirmed", tenantId, commitmentId);
    const reservations = new FakeReservationRepository(reservation);
    const commitments = new FakeCommitmentRepository();
    const publisher = new FakeEventPublisher();

    await new ConsumeReservationUseCase(reservations, commitments, publisher).execute({
      tenantId,
      reservationId: reservation.id,
      actorUserId: randomUUID(),
    });

    expect(commitments.consumed).toEqual([commitmentId]);
    expect(publisher.published[0]?.type).toBe(RESERVATION_CONSUMED);
  });

  it("rejects consuming a reservation twice", async () => {
    const reservation = makeReservation("consumed", tenantId, randomUUID());
    const reservations = new FakeReservationRepository(reservation);
    const commitments = new FakeCommitmentRepository();

    await expect(
      new ConsumeReservationUseCase(reservations, commitments, new FakeEventPublisher()).execute({
        tenantId,
        reservationId: reservation.id,
        actorUserId: randomUUID(),
      }),
    ).rejects.toBeInstanceOf(InvalidReservationTransitionError);
    expect(commitments.consumed).toHaveLength(0);
  });

  it("rejects consuming a pending (unconfirmed) reservation", async () => {
    const reservation = makeReservation("pending", tenantId, randomUUID());
    const reservations = new FakeReservationRepository(reservation);
    const commitments = new FakeCommitmentRepository();

    await expect(
      new ConsumeReservationUseCase(reservations, commitments, new FakeEventPublisher()).execute({
        tenantId,
        reservationId: reservation.id,
        actorUserId: randomUUID(),
      }),
    ).rejects.toBeInstanceOf(InvalidReservationTransitionError);
  });
});
