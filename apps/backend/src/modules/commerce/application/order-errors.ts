import type { OrderStatus } from "../domain/order.entity.js";

export class OrderNotFoundError extends Error {
  constructor() {
    super("order not found");
  }
}

/** spec: commerce/order - every transition requirement's "rejected" scenario. */
export class InvalidOrderTransitionError extends Error {
  constructor(currentStatus: OrderStatus, attempted: OrderStatus) {
    super(`cannot transition order from '${currentStatus}' to '${attempted}'`);
  }
}

export class VariantNotFoundError extends Error {
  constructor() {
    super("product variant not found");
  }
}

export class EmptyCartError extends Error {
  constructor() {
    super("cart must contain at least one line");
  }
}
