import { registerAuditConsumers } from "../modules/audit/infrastructure/audit-outbox-consumer.js";
import { registerTicketingConsumers } from "../modules/ticketing/infrastructure/ticketing-outbox-consumer.js";

/** Single place every module registers its outbox consumers from. */
export function registerAllConsumers(): void {
  registerAuditConsumers();
  registerTicketingConsumers();
}
