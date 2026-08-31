import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { CreateReservationUseCase } from "./create-reservation.usecase.js";
import { Resource } from "../domain/resource.entity.js";
import { Reservation } from "../domain/reservation.entity.js";
import type {
  CapacityCommitmentRepositoryPort,
  CreateReservationInput,
  ReservationRepositoryPort,
  ResourceRepositoryPort,
} from "../domain/ports.js";
import type { DomainEvent } from "../../../events/domain-event.js";
import type { EventPublisherPort } from "../../../shared-kernel/ports.js";
import { RESERVATION_CREATED } from "../domain/events.js";

class FakeResourceRepository implements ResourceRepositoryPort {
  constructor(private readonly resources: Resource[]) {}
  async create(): Promise<Resource> {
    throw new Error("not used in this test");
  }
  async findById(tenantId: string, id: string): Promise<Resource | null> {
    return this.resources.find((r) => r.tenantId === tenantId && r.id === id) ?? null;
  }
  async listByVenue(): Promise<Resource[]> {
    throw new Error("not used in this test");
  }
  async setDefaultCapacity(): Promise<void> {
    throw new Error("not used in this test");
  }
}

class FakeCommitmentRepository implements CapacityCommitmentRepositoryPort {
  constructor(private readonly acceptsCommit: boolean) {}
  public committed: Array<{ resourceId: string; period: string; amount: number }> = [];
  async tryCommit(input: {
    tenantId: string;
    resourceId: string;
    period: string;
    amount: number;
    hardCapacity: boolean;
  }): Promise<{ id: string } | null> {
    if (!this.acceptsCommit) return null;
    this.committed.push({ resourceId: input.resourceId, period: input.period, amount: input.amount });
    return { id: randomUUID() };
  }
  async releaseCommitment(): Promise<boolean> {
    throw new Error("not used in this test");
  }
  async markConsumed(): Promise<boolean> {
    throw new Error("not used in this test");
  }
}

class FakeReservationRepository implements ReservationRepositoryPort {
  public created: Reservation[] = [];
  async create(input: CreateReservationInput): Promise<Reservation> {
    const reservation = Reservation.create({
      id: input.id,
      tenantId: input.tenantId,
      resourceId: input.resourceId,
      period: input.period,
      amount: input.amount,
      status: "pending",
      commitmentId: input.commitmentId,
      expiresAt: input.expiresAt,
    });
    this.created.push(reservation);
    return reservation;
  }
  async findById(): Promise<Reservation | null> {
    throw new Error("not used in this test");
  }
  async transitionStatus(): Promise<boolean> {
    throw new Error("not used in this test");
  }
}

class FakeEventPublisher implements EventPublisherPort {
  public published: DomainEvent[] = [];
  async publish(events: DomainEvent[]): Promise<void> {
    this.published.push(...events);
  }
}

describe("CreateReservationUseCase", () => {
  const tenantId = randomUUID();
  const resource = Resource.create({
    id: randomUUID(),
    tenantId,
    venueId: randomUUID(),
    name: "Portão",
    defaultCapacity: 100,
    hardCapacity: true,
  });

  it("holds capacity and creates a pending reservation", async () => {
    const commitments = new FakeCommitmentRepository(true);
    const reservations = new FakeReservationRepository();
    const publisher = new FakeEventPublisher();
    const useCase = new CreateReservationUseCase(
      new FakeResourceRepository([resource]),
      commitments,
      reservations,
      publisher,
    );

    const reservation = await useCase.execute({
      tenantId,
      resourceId: resource.id,
      period: "2026-06-15",
      amount: 10,
      expiresAt: new Date(Date.now() + 60_000),
      actorUserId: randomUUID(),
    });

    expect(reservation.status).toBe("pending");
    expect(reservations.created).toHaveLength(1);
    expect(commitments.committed).toHaveLength(1);
    expect(publisher.published[0]?.type).toBe(RESERVATION_CREATED);
  });

  it("creates no reservation when the capacity hold is rejected", async () => {
    const commitments = new FakeCommitmentRepository(false);
    const reservations = new FakeReservationRepository();
    const useCase = new CreateReservationUseCase(
      new FakeResourceRepository([resource]),
      commitments,
      reservations,
      new FakeEventPublisher(),
    );

    await expect(
      useCase.execute({
        tenantId,
        resourceId: resource.id,
        period: "2026-06-15",
        amount: 10,
        expiresAt: new Date(Date.now() + 60_000),
        actorUserId: randomUUID(),
      }),
    ).rejects.toThrow();
    expect(reservations.created).toHaveLength(0);
  });
});
