import { sql } from "kysely";
import type { Trx } from "../http/tx-route.js";
import type { EventPublisherPort } from "../shared-kernel/ports.js";
import type { DomainEvent } from "./domain-event.js";

/**
 * Writes domain events to the outbox_events table using the SAME transaction
 * as the domain change that produced them, so the change and the event
 * commit or roll back together (design.md D6). A trigger on outbox_events
 * issues NOTIFY on insert, waking the outbox worker.
 *
 * app.tenant_id is (re-)set here from each event's own tenantId right
 * before the insert, rather than assumed already set on the transaction:
 * some publishers run in a request that has no tenant context yet (e.g.
 * organization creation, which is unauthenticated and publishes
 * organization.created for the tenant it just created within the same
 * transaction) - the outbox_events RLS policy still requires a matching
 * app.tenant_id at INSERT time (found via manual verification).
 */
export class OutboxEventPublisher implements EventPublisherPort {
  constructor(private readonly trx: Trx) {}

  async publish(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await sql`select set_config('app.tenant_id', ${event.tenantId}, true)`.execute(this.trx);
      await this.trx
        .insertInto("outbox_events")
        .values({ tenant_id: event.tenantId, event_type: event.type, payload: event.payload })
        .execute();
    }
  }
}
