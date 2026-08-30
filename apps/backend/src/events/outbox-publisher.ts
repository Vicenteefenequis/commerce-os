import type { Trx } from "../http/tx-route.js";
import type { EventPublisherPort } from "../shared-kernel/ports.js";
import type { DomainEvent } from "./domain-event.js";

/**
 * Writes domain events to the outbox_events table using the SAME transaction
 * as the domain change that produced them, so the change and the event
 * commit or roll back together (design.md D6). A trigger on outbox_events
 * issues NOTIFY on insert, waking the outbox worker.
 */
export class OutboxEventPublisher implements EventPublisherPort {
  constructor(private readonly trx: Trx) {}

  async publish(events: DomainEvent[]): Promise<void> {
    if (events.length === 0) return;
    await this.trx
      .insertInto("outbox_events")
      .values(
        events.map((event) => ({
          tenant_id: event.tenantId,
          event_type: event.type,
          payload: event.payload,
        })),
      )
      .execute();
  }
}
