import type { DomainEvent } from "../../../events/domain-event.js";

export const RESOURCE_CREATED = "resource.created";
export const RESOURCE_CAPACITY_SET = "resource.capacity_set";

export interface ResourceCreatedPayload {
  resourceId: string;
  venueId: string;
  name: string;
  defaultCapacity: number;
  actorUserId: string;
}

export interface ResourceCapacitySetPayload {
  resourceId: string;
  period: string | null;
  capacity: number;
  actorUserId: string;
}

export function resourceCreatedEvent(tenantId: string, payload: ResourceCreatedPayload): DomainEvent {
  return { tenantId, type: RESOURCE_CREATED, payload: { ...payload } };
}

export function resourceCapacitySetEvent(
  tenantId: string,
  payload: ResourceCapacitySetPayload,
): DomainEvent {
  return { tenantId, type: RESOURCE_CAPACITY_SET, payload: { ...payload } };
}
