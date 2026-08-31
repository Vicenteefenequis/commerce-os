import type { EventPublisherPort } from "../../../shared-kernel/ports.js";
import type { OrderStatus } from "../domain/order.entity.js";
import { orderStatusChangedEvent } from "../domain/events.js";
import type { OrderRepositoryPort } from "../domain/ports.js";
import { InvalidOrderTransitionError, OrderNotFoundError } from "./order-errors.js";
import { isValidOrderTransition } from "./order-transitions.js";

export interface TransitionOrderStatusInput {
  tenantId: string;
  orderId: string;
  to: OrderStatus;
  /** Resolved by the caller to a real users.id - see create-order.usecase.ts's actorUserId doc. */
  actorUserId: string;
}

/** spec: commerce/order - "Order lifecycle states", "Order status transitions are recorded". */
export class TransitionOrderStatusUseCase {
  constructor(
    private readonly orders: OrderRepositoryPort,
    private readonly eventPublisher: EventPublisherPort,
  ) {}

  async execute(input: TransitionOrderStatusInput): Promise<void> {
    const existing = await this.orders.findById(input.tenantId, input.orderId);
    if (!existing) throw new OrderNotFoundError();

    if (!isValidOrderTransition(existing.status, input.to)) {
      throw new InvalidOrderTransitionError(existing.status, input.to);
    }

    const updated = await this.orders.transitionStatus(
      input.tenantId,
      input.orderId,
      existing.status,
      input.to,
    );
    if (!updated) {
      throw new InvalidOrderTransitionError(existing.status, input.to);
    }

    await this.orders.recordStatusHistory(
      input.tenantId,
      input.orderId,
      existing.status,
      input.to,
      input.actorUserId,
    );

    await this.eventPublisher.publish([
      orderStatusChangedEvent(input.tenantId, {
        orderId: input.orderId,
        fromStatus: existing.status,
        toStatus: input.to,
        actorUserId: input.actorUserId,
      }),
    ]);
  }
}
