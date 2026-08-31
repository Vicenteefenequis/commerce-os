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

export const RESERVATION_CREATED = "reservation.created";
export const RESERVATION_CONFIRMED = "reservation.confirmed";
export const RESERVATION_EXPIRED = "reservation.expired";
export const RESERVATION_CANCELLED = "reservation.cancelled";
export const RESERVATION_CONSUMED = "reservation.consumed";

export interface ReservationCreatedPayload {
  reservationId: string;
  resourceId: string;
  period: string;
  amount: number;
  actorUserId: string;
}

export interface ReservationTransitionPayload {
  reservationId: string;
  actorUserId: string;
}

export function reservationCreatedEvent(tenantId: string, payload: ReservationCreatedPayload): DomainEvent {
  return { tenantId, type: RESERVATION_CREATED, payload: { ...payload } };
}

export function reservationConfirmedEvent(
  tenantId: string,
  payload: ReservationTransitionPayload,
): DomainEvent {
  return { tenantId, type: RESERVATION_CONFIRMED, payload: { ...payload } };
}

export function reservationExpiredEvent(
  tenantId: string,
  payload: ReservationTransitionPayload,
): DomainEvent {
  return { tenantId, type: RESERVATION_EXPIRED, payload: { ...payload } };
}

export function reservationCancelledEvent(
  tenantId: string,
  payload: ReservationTransitionPayload,
): DomainEvent {
  return { tenantId, type: RESERVATION_CANCELLED, payload: { ...payload } };
}

export function reservationConsumedEvent(
  tenantId: string,
  payload: ReservationTransitionPayload,
): DomainEvent {
  return { tenantId, type: RESERVATION_CONSUMED, payload: { ...payload } };
}
