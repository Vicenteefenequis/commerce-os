import type { ReservationStatus } from "../domain/reservation.entity.js";

export class ReservationNotFoundError extends Error {
  constructor() {
    super("reservation not found");
  }
}

/** spec: capacity/reservation - every transition requirement's "rejected" scenario. */
export class InvalidReservationTransitionError extends Error {
  constructor(currentStatus: ReservationStatus, attempted: ReservationStatus) {
    super(`cannot transition reservation from '${currentStatus}' to '${attempted}'`);
  }
}
