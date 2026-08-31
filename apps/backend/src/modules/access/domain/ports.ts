import type { ScanAttempt } from "./scan-attempt.entity.js";
import type { ScanOutcome } from "./scan-outcome.js";

export interface RecordScanAttemptInput {
  id: string;
  tenantId: string;
  entitlementId: string | null;
  ticketCode: string;
  venueId: string;
  outcome: ScanOutcome;
  /** The instant the scan was classified against, not the instant of the INSERT. */
  scannedAt: Date;
}

/**
 * Append-only (design.md D6): recording an attempt is the only write, and
 * there is deliberately no update or delete - an entry attempt is a
 * historical fact, not a mutable row.
 */
export interface ScanAttemptRepositoryPort {
  record(input: RecordScanAttemptInput): Promise<ScanAttempt>;
}

export interface ReservationPeriodLookupPort {
  /**
   * The Reservation's period as an ISO calendar date (`YYYY-MM-DD`), or
   * null when no such Reservation exists. Only the period is exposed
   * because that is the sole thing Access Control needs from a Reservation
   * (design.md D3) - it never inspects the Reservation's own lifecycle.
   */
  findPeriodByReservationId(tenantId: string, reservationId: string): Promise<string | null>;
}
