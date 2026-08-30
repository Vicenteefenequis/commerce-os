import { AuditEntry } from "../domain/audit-entry.entity.js";
import type { AuditRepositoryPort } from "../domain/ports.js";

export interface RecordAuditEntryInput {
  tenantId: string;
  actorUserId: string;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown>;
  eventId: string;
}

/**
 * Consumes a domain event (via the outbox) and records an audit entry.
 * Idempotent by eventId: redelivery of the same outbox event must not
 * create a duplicate entry (spec: foundation/audit - "Audit trail is
 * reliable under retries and failures").
 */
export class RecordAuditEntryUseCase {
  constructor(private readonly audit: AuditRepositoryPort) {}

  async execute(input: RecordAuditEntryInput): Promise<void> {
    const alreadyRecorded = await this.audit.existsForEvent(input.eventId);
    if (alreadyRecorded) {
      return;
    }

    const entry = AuditEntry.create({
      tenantId: input.tenantId,
      actorUserId: input.actorUserId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: input.metadata,
      eventId: input.eventId,
    });

    await this.audit.record(entry);
  }
}
