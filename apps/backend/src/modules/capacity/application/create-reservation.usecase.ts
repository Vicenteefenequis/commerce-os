import { randomUUID } from "node:crypto";
import type { EventPublisherPort } from "../../../shared-kernel/ports.js";
import { CommitCapacityUseCase } from "./commit-capacity.usecase.js";
import { reservationCreatedEvent } from "../domain/events.js";
import { Reservation } from "../domain/reservation.entity.js";
import type {
  CapacityCommitmentRepositoryPort,
  ReservationRepositoryPort,
  ResourceRepositoryPort,
} from "../domain/ports.js";

export interface CreateReservationInput {
  tenantId: string;
  resourceId: string;
  period: string;
  amount: number;
  /**
   * When the hold should be released if never confirmed. Supplied by the
   * caller (design.md Non-Goals: this module has no TTL/expiry policy of
   * its own - Checkout decides it).
   */
  expiresAt: Date;
  actorUserId: string;
}

/**
 * spec: capacity/reservation - "Reservation creation holds capacity".
 * Delegates the hold itself to CommitCapacityUseCase (design.md D1):
 * rejection there (CapacityExceededError, ResourceNotFoundError,
 * InvalidResourceError) means no Reservation is created either.
 */
export class CreateReservationUseCase {
  constructor(
    private readonly resources: ResourceRepositoryPort,
    private readonly commitments: CapacityCommitmentRepositoryPort,
    private readonly reservations: ReservationRepositoryPort,
    private readonly eventPublisher: EventPublisherPort,
  ) {}

  async execute(input: CreateReservationInput): Promise<Reservation> {
    const commitment = await new CommitCapacityUseCase(this.resources, this.commitments).execute({
      tenantId: input.tenantId,
      resourceId: input.resourceId,
      period: input.period,
      amount: input.amount,
    });

    const reservation = await this.reservations.create({
      id: randomUUID(),
      tenantId: input.tenantId,
      resourceId: input.resourceId,
      period: input.period,
      amount: input.amount,
      commitmentId: commitment.id,
      expiresAt: input.expiresAt,
    });

    await this.eventPublisher.publish([
      reservationCreatedEvent(input.tenantId, {
        reservationId: reservation.id,
        resourceId: input.resourceId,
        period: input.period,
        amount: input.amount,
        actorUserId: input.actorUserId,
      }),
    ]);

    return reservation;
  }
}
