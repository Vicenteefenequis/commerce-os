import type { AuditEntry } from "./audit-entry.entity.js";

export interface AuditRepositoryPort {
  /** Returns true if an entry for this eventId was already recorded (idempotency, INV-005). */
  existsForEvent(eventId: string): Promise<boolean>;
  record(entry: AuditEntry): Promise<void>;
}
