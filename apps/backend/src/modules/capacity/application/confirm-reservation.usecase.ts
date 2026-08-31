import type { EventPublisherPort } from "../../../shared-kernel/ports.js";
import { reservationConfirmedEvent } from "../domain/events.js";
import type { ReservationRepositoryPort } from "../domain/ports.js";
import { InvalidReservationTransitionError, ReservationNotFoundError } from "./reservation-errors.js";

export interface ConfirmReservationInput {
  tenantId: string;
  reservationId: string;
  actorUserId: string;
}

/** spec: capacity/reservation - "Reservation confirmation". */
export class ConfirmReservationUseCase {
  constructor(
    private readonly reservations: ReservationRepositoryPort,
    private readonly eventPublisher: EventPublisherPort,
  ) {}

  async execute(input: ConfirmReservationInput): Promise<void> {
    const updated = await this.reservations.transitionStatus(
      input.tenantId,
      input.reservationId,
      "pending",
      "confirmed",
    );

    if (!updated) {
      const existing = await this.reservations.findById(input.tenantId, input.reservationId);
      if (!existing) throw new ReservationNotFoundError();
      throw new InvalidReservationTransitionError(existing.status, "confirmed");
    }

    await this.eventPublisher.publish([
      reservationConfirmedEvent(input.tenantId, {
        reservationId: input.reservationId,
        actorUserId: input.actorUserId,
      }),
    ]);
  }
}
