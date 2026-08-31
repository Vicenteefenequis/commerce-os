import { randomUUID } from "node:crypto";
import type { OrderRepositoryPort } from "../../commerce/domain/ports.js";
import type { EntitlementRepositoryPort, TicketRepositoryPort } from "../../ticketing/domain/ports.js";
import type { VenueRepositoryPort } from "../../venue/domain/ports.js";
import type { ReservationPeriodLookupPort, ScanAttemptRepositoryPort } from "../domain/ports.js";
import type { ScanOutcome } from "../domain/scan-outcome.js";
import { classifyScanTime } from "../domain/scan-time-window.js";

/** The selected Venue is missing or is not one of the caller's own (design.md D1). */
export class UnknownScanVenueError extends Error {
  constructor(message = "venueId must reference a Venue in your organization") {
    super(message);
  }
}

export interface ScanTicketInput {
  tenantId: string;
  /** The code read off the Ticket's QR. */
  code: string;
  /** The Venue the operator selected for this scanning session (design.md D1). */
  venueId: string;
  /** Injectable clock; defaults to now. The same instant classifies the scan and stamps the recorded attempt. */
  now?: Date;
}

export interface ScanTicketResult {
  outcome: ScanOutcome;
  /** Null only when the code matched no Ticket at all. */
  entitlementId: string | null;
  scannedAt: Date;
}

interface Classification {
  outcome: ScanOutcome;
  entitlementId: string | null;
}

/**
 * spec: access/scan. Resolves a scanned code to its Entitlement, decides
 * one of the six outcomes, consumes the Entitlement when (and only when)
 * the scan is authorized, and records the attempt either way.
 *
 * Order of checks is deliberate and follows the spec, not convenience:
 * venue is decided before "already used" because a ticket sold for
 * another Venue is wrong venue "regardless of the Entitlement's other
 * state", and consumption is attempted last so no denial path can ever
 * reach it.
 */
export class ScanTicketUseCase {
  constructor(
    private readonly venues: VenueRepositoryPort,
    private readonly tickets: TicketRepositoryPort,
    private readonly entitlements: EntitlementRepositoryPort,
    private readonly orders: OrderRepositoryPort,
    private readonly reservationPeriods: ReservationPeriodLookupPort,
    private readonly scanAttempts: ScanAttemptRepositoryPort,
  ) {}

  async execute(input: ScanTicketInput): Promise<ScanTicketResult> {
    const now = input.now ?? new Date();

    // spec: "Scan is evaluated against an explicitly selected Venue" - a
    // request without a usable Venue is rejected before the Ticket is
    // looked at, so nothing is evaluated and no attempt is recorded
    // against a scanning session that does not exist.
    if (!input.venueId) throw new UnknownScanVenueError("venueId is required");
    const venue = await this.venues.findById(input.tenantId, input.venueId);
    if (!venue) throw new UnknownScanVenueError();

    const classification = await this.classify(input, now);

    // spec: "Every scan attempt is recorded" - written for denials too
    // (design.md D6), inside the same transaction as any consumption.
    await this.scanAttempts.record({
      id: randomUUID(),
      tenantId: input.tenantId,
      entitlementId: classification.entitlementId,
      ticketCode: input.code,
      venueId: input.venueId,
      outcome: classification.outcome,
      scannedAt: now,
    });

    return { ...classification, scannedAt: now };
  }

  private async classify(input: ScanTicketInput, now: Date): Promise<Classification> {
    // spec: "Unknown or malformed code" / "Access Control is isolated by
    // tenant" - the tenant-scoped lookup makes another Organization's code
    // indistinguishable from one that never existed.
    const ticket = input.code ? await this.tickets.findByCode(input.tenantId, input.code) : null;
    if (!ticket) return { outcome: "invalid", entitlementId: null };

    // A Ticket without its Entitlement cannot exist (FK + 1:1 index), but
    // treating the gap as `invalid` keeps the failure mode "no entry",
    // never "entry on unverifiable data".
    const entitlement = await this.entitlements.findById(input.tenantId, ticket.entitlementId);
    if (!entitlement) return { outcome: "invalid", entitlementId: null };

    const order = await this.orders.findById(input.tenantId, entitlement.orderId);
    if (!order) return { outcome: "invalid", entitlementId: entitlement.id };

    // spec: "Wrong venue is detected against the Order's Venue" - decided
    // from Order.venueId alone, never from a Resource or Reservation
    // (design.md D2), and checked before the Entitlement's own state.
    if (order.venueId !== input.venueId) return { outcome: "wrong_venue", entitlementId: entitlement.id };

    if (entitlement.isConsumed) return { outcome: "already_used", entitlementId: entitlement.id };

    // spec: "Wrong time and expired are detected only for
    // Reservation-backed Entitlements" (design.md D3): a line with no
    // Reservation carries no entry-time bound at all, so neither check
    // applies to it.
    const line = order.lines.find((l) => l.id === entitlement.orderLineId);
    const reservationId = line?.reservationId ?? null;
    if (reservationId) {
      const period = await this.reservationPeriods.findPeriodByReservationId(input.tenantId, reservationId);
      if (period) {
        const position = classifyScanTime(now, period);
        if (position === "before") return { outcome: "wrong_time", entitlementId: entitlement.id };
        if (position === "after") return { outcome: "expired", entitlementId: entitlement.id };
      }
    }

    // spec: "Successful scan consumes the Entitlement atomically". A false
    // return means a concurrent scan won the guarded UPDATE, which is
    // exactly the double-scan protection: the loser is already used
    // (design.md D5).
    const consumed = await this.entitlements.consume(input.tenantId, entitlement.id);
    return { outcome: consumed ? "authorized" : "already_used", entitlementId: entitlement.id };
  }
}
