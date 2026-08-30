import type { Trx } from "../../../http/tx-route.js";
import type { AuditEntry } from "../domain/audit-entry.entity.js";
import type { AuditRepositoryPort } from "../domain/ports.js";

export class KyselyAuditRepository implements AuditRepositoryPort {
  constructor(private readonly trx: Trx) {}

  async existsForEvent(eventId: string): Promise<boolean> {
    const row = await this.trx
      .selectFrom("audit_log")
      .select("id")
      .where("event_id", "=", eventId)
      .executeTakeFirst();
    return row !== undefined;
  }

  async record(entry: AuditEntry): Promise<void> {
    // ON CONFLICT DO NOTHING on the event_id unique constraint is the
    // atomic backstop for idempotency (existsForEvent alone has a
    // check-then-act race under concurrent redelivery).
    await this.trx
      .insertInto("audit_log")
      .values({
        tenant_id: entry.tenantId,
        actor_user_id: entry.actorUserId,
        action: entry.action,
        entity_type: entry.entityType,
        entity_id: entry.entityId,
        metadata: entry.metadata,
        event_id: entry.eventId,
      })
      .onConflict((oc) => oc.column("event_id").doNothing())
      .execute();
  }
}
