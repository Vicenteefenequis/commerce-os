import { CONFIGURATION_CHANGED, type ConfigurationChangedPayload } from "../../configuration/domain/events.js";
import { registerOutboxConsumer } from "../../../events/outbox-consumer-registry.js";
import { RecordAuditEntryUseCase } from "../application/record-audit-entry.usecase.js";
import { KyselyAuditRepository } from "./audit-repository.kysely.js";

/**
 * Registers Audit as a consumer of sensitive domain events (spec:
 * foundation/audit). Scoped to configuration.changed only for now -
 * organization.created has no identifiable actor (bootstrap endpoint) and
 * there is no permission-change event yet (no AssignRole use-case exists
 * in this change's scope). See design.md Open Questions.
 */
export function registerAuditConsumers(): void {
  registerOutboxConsumer(CONFIGURATION_CHANGED, async (event, trx) => {
    const payload = event.payload as unknown as ConfigurationChangedPayload;
    const useCase = new RecordAuditEntryUseCase(new KyselyAuditRepository(trx));
    await useCase.execute({
      tenantId: event.tenantId,
      actorUserId: payload.actorUserId,
      action: CONFIGURATION_CHANGED,
      entityType: "organization_configuration",
      entityId: null,
      metadata: { key: payload.key, value: payload.value },
      eventId: event.id,
    });
  });
}
