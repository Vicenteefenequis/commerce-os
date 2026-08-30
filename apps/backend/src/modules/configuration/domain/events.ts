import type { DomainEvent } from "../../../events/domain-event.js";

export const CONFIGURATION_CHANGED = "configuration.changed";

export interface ConfigurationChangedPayload {
  key: string;
  value: string;
  actorUserId: string;
}

export function configurationChangedEvent(
  tenantId: string,
  payload: ConfigurationChangedPayload,
): DomainEvent {
  return { tenantId, type: CONFIGURATION_CHANGED, payload: { ...payload } };
}
