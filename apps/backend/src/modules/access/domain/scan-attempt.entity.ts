import type { ScanOutcome } from "./scan-outcome.js";

export class InvalidScanAttemptError extends Error {}

export interface ScanAttemptProps {
  id: string;
  tenantId: string;
  /** Null when the scanned code matched no Ticket (spec: access/scan - "Unknown or malformed code"). */
  entitlementId: string | null;
  /** The raw scanned code, kept even when it resolved to nothing. */
  ticketCode: string;
  /** The Venue the operator selected for this scanning session (design.md D1). */
  venueId: string;
  outcome: ScanOutcome;
  scannedAt: Date;
}

/**
 * A single recorded entry attempt at the door (spec: access/scan - "Every
 * scan attempt is recorded"). Append-only by design (design.md D6): an
 * attempt is a historical fact, so this entity intentionally exposes no
 * mutators and its repository no update method.
 */
export class ScanAttempt {
  private constructor(private readonly props: ScanAttemptProps) {}

  static create(props: ScanAttemptProps): ScanAttempt {
    if (!props.tenantId) throw new InvalidScanAttemptError("tenantId is required");
    if (!props.venueId) throw new InvalidScanAttemptError("venueId is required");
    if (!props.ticketCode || props.ticketCode.trim().length === 0) {
      throw new InvalidScanAttemptError("ticketCode is required");
    }
    return new ScanAttempt(props);
  }

  get id(): string {
    return this.props.id;
  }

  get tenantId(): string {
    return this.props.tenantId;
  }

  get entitlementId(): string | null {
    return this.props.entitlementId;
  }

  get ticketCode(): string {
    return this.props.ticketCode;
  }

  get venueId(): string {
    return this.props.venueId;
  }

  get outcome(): ScanOutcome {
    return this.props.outcome;
  }

  get scannedAt(): Date {
    return this.props.scannedAt;
  }

  get authorized(): boolean {
    return this.props.outcome === "authorized";
  }
}
