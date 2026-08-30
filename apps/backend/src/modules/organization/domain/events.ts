import type { DomainEvent } from "../../../events/domain-event.js";

export const ORGANIZATION_CREATED = "organization.created";

export interface OrganizationCreatedPayload {
  organizationId: string;
  name: string;
}

export function organizationCreatedEvent(
  tenantId: string,
  payload: OrganizationCreatedPayload,
): DomainEvent {
  return { tenantId, type: ORGANIZATION_CREATED, payload: { ...payload } };
}
