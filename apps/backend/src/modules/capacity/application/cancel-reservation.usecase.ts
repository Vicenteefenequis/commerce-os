import type { EventPublisherPort } from "../../../shared-kernel/ports.js";
import { reservationCancelledEvent } from "../domain/events.js";
import type { CapacityCommitmentRepositoryPort, ReservationRepositoryPort } from "../domain/ports.js";
import { InvalidReservationTransitionError, ReservationNotFoundError } from "./reservation-errors.js";

export interface CancelReservationInput {
  tenantId: string;
  reservationId: string;
  actorUserId: string;
}

/** spec: capacity/reservation - "Reservation cancellation releases capacity". */
export class CancelReservationUseCase {
  constructor(
    private readonly reservations: ReservationRepositoryPort,
    private readonly commitments: CapacityCommitmentRepositoryPort,
    private readonly eventPublisher: EventPublisherPort,
  ) {}

  async execute(input: CancelReservationInput): Promise<void> {
    const existing = await this.reservations.findById(input.tenantId, input.reservationId);
    if (!existing) throw new ReservationNotFoundError();

    const updated = await this.reservations.transitionStatus(
      input.tenantId,
      input.reservationId,
      ["pending", "confirmed"],
      "cancelled",
    );
    if (!updated) {
      throw new InvalidReservationTransitionError(existing.status, "cancelled");
    }

    await this.commitments.releaseCommitment(input.tenantId, existing.commitmentId);

    await this.eventPublisher.publish([
      reservationCancelledEvent(input.tenantId, {
        reservationId: input.reservationId,
        actorUserId: input.actorUserId,
      }),
    ]);
  }
}
