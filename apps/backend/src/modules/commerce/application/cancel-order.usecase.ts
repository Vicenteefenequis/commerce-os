import type { EventPublisherPort } from "../../../shared-kernel/ports.js";
import { CancelReservationUseCase } from "../../capacity/application/cancel-reservation.usecase.js";
import type { CapacityCommitmentRepositoryPort, ReservationRepositoryPort } from "../../capacity/domain/ports.js";
import { orderCancelledEvent } from "../domain/events.js";
import type { OrderRepositoryPort } from "../domain/ports.js";
import { InvalidOrderTransitionError, OrderNotFoundError } from "./order-errors.js";

export interface CancelOrderInput {
  tenantId: string;
  orderId: string;
  /** Resolved by the caller to a real users.id - see create-order.usecase.ts's actorUserId doc. */
  actorUserId: string;
}

/** spec: commerce/order - "Order cancellation releases held capacity". */
export class CancelOrderUseCase {
  constructor(
    private readonly orders: OrderRepositoryPort,
    private readonly reservations: ReservationRepositoryPort,
    private readonly commitments: CapacityCommitmentRepositoryPort,
    private readonly eventPublisher: EventPublisherPort,
  ) {}

  async execute(input: CancelOrderInput): Promise<void> {
    const existing = await this.orders.findById(input.tenantId, input.orderId);
    if (!existing) throw new OrderNotFoundError();

    const updated = await this.orders.transitionStatus(
      input.tenantId,
      input.orderId,
      ["draft", "awaiting_payment"],
      "cancelled",
    );
    if (!updated) {
      throw new InvalidOrderTransitionError(existing.status, "cancelled");
    }

    const cancelReservation = new CancelReservationUseCase(
      this.reservations,
      this.commitments,
      this.eventPublisher,
    );
    for (const line of existing.lines) {
      if (line.reservationId) {
        await cancelReservation.execute({
          tenantId: input.tenantId,
          reservationId: line.reservationId,
          actorUserId: input.actorUserId,
        });
      }
    }

    await this.orders.recordStatusHistory(
      input.tenantId,
      input.orderId,
      existing.status,
      "cancelled",
      input.actorUserId,
    );

    await this.eventPublisher.publish([
      orderCancelledEvent(input.tenantId, { orderId: input.orderId, actorUserId: input.actorUserId }),
    ]);
  }
}
