import type { EventPublisherPort } from "../../../shared-kernel/ports.js";
import { reservationExpiredEvent } from "../domain/events.js";
import type { CapacityCommitmentRepositoryPort, ReservationRepositoryPort } from "../domain/ports.js";
import { InvalidReservationTransitionError, ReservationNotFoundError } from "./reservation-errors.js";

export interface ExpireReservationInput {
  tenantId: string;
  reservationId: string;
  actorUserId: string;
}

/**
 * spec: capacity/reservation - "Reservation expiry releases capacity".
 * Both the reservation's status update and its commitment's release run
 * against repositories sharing the caller's transaction (design.md D2),
 * so the two writes commit or roll back together.
 */
export class ExpireReservationUseCase {
  constructor(
    private readonly reservations: ReservationRepositoryPort,
    private readonly commitments: CapacityCommitmentRepositoryPort,
    private readonly eventPublisher: EventPublisherPort,
  ) {}

  async execute(input: ExpireReservationInput): Promise<void> {
    const existing = await this.reservations.findById(input.tenantId, input.reservationId);
    if (!existing) throw new ReservationNotFoundError();

    const updated = await this.reservations.transitionStatus(
      input.tenantId,
      input.reservationId,
      "pending",
      "expired",
    );
    if (!updated) {
      throw new InvalidReservationTransitionError(existing.status, "expired");
    }

    await this.commitments.releaseCommitment(input.tenantId, existing.commitmentId);

    await this.eventPublisher.publish([
      reservationExpiredEvent(input.tenantId, {
        reservationId: input.reservationId,
        actorUserId: input.actorUserId,
      }),
    ]);
  }
}
