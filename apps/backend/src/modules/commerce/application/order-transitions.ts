import type { OrderStatus } from "../domain/order.entity.js";

/**
 * spec: commerce/order - "Order lifecycle states" (ORD-001). Payment (M3)
 * and fulfillment (M4/M5) are not built yet, so nothing in this change
 * drives most of these transitions - they exist here as the guarded state
 * machine those milestones will call into, following the same shape as
 * capacity/reservation's guarded transitions.
 */
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  draft: ["awaiting_payment", "cancelled", "expired"],
  awaiting_payment: ["paid", "cancelled", "expired"],
  paid: ["fulfilled", "partially_refunded", "refunded"],
  fulfilled: ["partially_refunded", "refunded"],
  partially_refunded: ["refunded"],
  refunded: [],
  cancelled: [],
  expired: [],
};

export function isValidOrderTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from].includes(to);
}
