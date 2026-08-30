import type { DomainEvent } from "../events/domain-event.js";

/**
 * Port implemented by the outbox publisher adapter. Domain/application
 * layers depend on this interface only, never on Kysely or Postgres directly.
 */
export interface EventPublisherPort {
  publish(events: DomainEvent[]): Promise<void>;
}
