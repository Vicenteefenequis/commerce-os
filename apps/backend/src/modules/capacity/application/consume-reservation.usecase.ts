import type { EventPublisherPort } from "../../../shared-kernel/ports.js";
import { reservationConsumedEvent } from "../domain/events.js";
import type { CapacityCommitmentRepositoryPort, ReservationRepositoryPort } from "../domain/ports.js";
import { InvalidReservationTransitionError, ReservationNotFoundError } from "./reservation-errors.js";

export interface ConsumeReservationInput {
  tenantId: string;
  reservationId: string;
  actorUserId: string;
}

/** spec: capacity/reservation - "Reservation consumption is terminal". */
export class ConsumeReservationUseCase {
  constructor(
    private readonly reservations: ReservationRepositoryPort,
    private readonly commitments: CapacityCommitmentRepositoryPort,
    private readonly eventPublisher: EventPublisherPort,
  ) {}

  async execute(input: ConsumeReservationInput): Promise<void> {
    const existing = await this.reservations.findById(input.tenantId, input.reservationId);
    if (!existing) throw new ReservationNotFoundError();

    const updated = await this.reservations.transitionStatus(
      input.tenantId,
      input.reservationId,
      "confirmed",
      "consumed",
    );
    if (!updated) {
      throw new InvalidReservationTransitionError(existing.status, "consumed");
    }

    await this.commitments.markConsumed(input.tenantId, existing.commitmentId);

    await this.eventPublisher.publish([
      reservationConsumedEvent(input.tenantId, {
        reservationId: input.reservationId,
        actorUserId: input.actorUserId,
      }),
    ]);
  }
}
