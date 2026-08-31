import type { Order, OrderStatus } from "./order.entity.js";

export interface CreateOrderLineInput {
  id: string;
  variantId: string;
  name: string;
  unitPriceCents: number;
  quantity: number;
  reservationId?: string | null;
}

export interface CreateOrderInput {
  id: string;
  tenantId: string;
  venueId: string;
  customerId: string;
  idempotencyKey?: string | null;
  lines: CreateOrderLineInput[];
}

export interface OrderRepositoryPort {
  create(input: CreateOrderInput): Promise<Order>;
  findById(tenantId: string, id: string): Promise<Order | null>;
  /** Used to satisfy CHK-005: a retried checkout submission returns the same Order instead of creating a second one. */
  findByIdempotencyKey(tenantId: string, idempotencyKey: string): Promise<Order | null>;
  /** Every Order belonging to the tenant, newest first (spec: commerce/order - "Orders can be listed by tenant"). */
  findAllByTenant(tenantId: string): Promise<Order[]>;
  /**
   * Guarded status transition: updates the row only if its current status
   * is one of `from`. Returns whether a row was updated - false means the
   * order was not in an expected status.
   */
  transitionStatus(
    tenantId: string,
    id: string,
    from: OrderStatus | OrderStatus[],
    to: OrderStatus,
  ): Promise<boolean>;
  /** Appends an entry to the Order's status history (spec: commerce/order - "Order status transitions are recorded"). */
  recordStatusHistory(
    tenantId: string,
    orderId: string,
    fromStatus: OrderStatus | null,
    toStatus: OrderStatus,
    actorUserId: string | null,
  ): Promise<void>;
}
