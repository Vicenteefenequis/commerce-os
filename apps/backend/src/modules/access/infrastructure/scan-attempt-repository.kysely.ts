import type { Trx } from "../../../http/tx-route.js";
import { ScanAttempt } from "../domain/scan-attempt.entity.js";
import type { RecordScanAttemptInput, ScanAttemptRepositoryPort } from "../domain/ports.js";

export class KyselyScanAttemptRepository implements ScanAttemptRepositoryPort {
  constructor(private readonly trx: Trx) {}

  /**
   * `scanned_at` is written explicitly rather than left to the column
   * default so the recorded attempt carries the same instant the scan was
   * classified against (spec: access/scan - wrong time/expired are decided
   * from that instant); a row whose timestamp disagreed with the decision
   * that produced it would make the audit trail unreadable.
   */
  async record(input: RecordScanAttemptInput): Promise<ScanAttempt> {
    await this.trx
      .insertInto("scan_attempts")
      .values({
        id: input.id,
        tenant_id: input.tenantId,
        entitlement_id: input.entitlementId,
        ticket_code: input.ticketCode,
        venue_id: input.venueId,
        outcome: input.outcome,
        scanned_at: input.scannedAt,
      })
      .execute();

    return ScanAttempt.create({
      id: input.id,
      tenantId: input.tenantId,
      entitlementId: input.entitlementId,
      ticketCode: input.ticketCode,
      venueId: input.venueId,
      outcome: input.outcome,
      scannedAt: input.scannedAt,
    });
  }
}
