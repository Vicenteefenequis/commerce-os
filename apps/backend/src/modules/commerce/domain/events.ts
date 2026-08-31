import type { DomainEvent } from "../../../events/domain-event.js";
import type { OrderStatus } from "./order.entity.js";

export const ORDER_CREATED = "order.created";
export const ORDER_STATUS_CHANGED = "order.status_changed";
export const ORDER_CANCELLED = "order.cancelled";
export const ORDER_FULFILLED = "order.fulfilled";

export interface OrderCreatedPayload {
  orderId: string;
  venueId: string;
  totalCents: number;
  actorUserId: string;
}

export interface OrderStatusChangedPayload {
  orderId: string;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  actorUserId: string;
}

export interface OrderCancelledPayload {
  orderId: string;
  actorUserId: string;
}

export interface OrderFulfilledPayload {
  orderId: string;
  actorUserId: string;
}

export function orderCreatedEvent(tenantId: string, payload: OrderCreatedPayload): DomainEvent {
  return { tenantId, type: ORDER_CREATED, payload: { ...payload } };
}

export function orderStatusChangedEvent(
  tenantId: string,
  payload: OrderStatusChangedPayload,
): DomainEvent {
  return { tenantId, type: ORDER_STATUS_CHANGED, payload: { ...payload } };
}

export function orderCancelledEvent(tenantId: string, payload: OrderCancelledPayload): DomainEvent {
  return { tenantId, type: ORDER_CANCELLED, payload: { ...payload } };
}

export function orderFulfilledEvent(tenantId: string, payload: OrderFulfilledPayload): DomainEvent {
  return { tenantId, type: ORDER_FULFILLED, payload: { ...payload } };
}
