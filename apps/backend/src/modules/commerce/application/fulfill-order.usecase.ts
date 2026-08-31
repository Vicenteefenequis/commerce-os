import type { EventPublisherPort } from "../../../shared-kernel/ports.js";
import { ConsumeReservationUseCase } from "../../capacity/application/consume-reservation.usecase.js";
import type { CapacityCommitmentRepositoryPort, ReservationRepositoryPort } from "../../capacity/domain/ports.js";
import { orderFulfilledEvent } from "../domain/events.js";
import type { OrderRepositoryPort } from "../domain/ports.js";
import { InvalidOrderTransitionError, OrderNotFoundError } from "./order-errors.js";

export interface FulfillOrderInput {
  tenantId: string;
  orderId: string;
  /** Resolved by the caller to a real users.id - see create-order.usecase.ts's actorUserId doc. */
  actorUserId: string;
}

/**
 * spec: commerce/fulfillment - "Order fulfillment", "Fulfillment consumes
 * held capacity". Consumes every Reservation backing the order's lines
 * before recording the order as fulfilled, mirroring
 * cancel-order.usecase.ts's per-line reservation handling.
 */
export class FulfillOrderUseCase {
  constructor(
    private readonly orders: OrderRepositoryPort,
    private readonly reservations: ReservationRepositoryPort,
    private readonly commitments: CapacityCommitmentRepositoryPort,
    private readonly eventPublisher: EventPublisherPort,
  ) {}

  async execute(input: FulfillOrderInput): Promise<void> {
    const existing = await this.orders.findById(input.tenantId, input.orderId);
    if (!existing) throw new OrderNotFoundError();

    const updated = await this.orders.transitionStatus(input.tenantId, input.orderId, "paid", "fulfilled");
    if (!updated) {
      throw new InvalidOrderTransitionError(existing.status, "fulfilled");
    }

    const consumeReservation = new ConsumeReservationUseCase(
      this.reservations,
      this.commitments,
      this.eventPublisher,
    );
    for (const line of existing.lines) {
      if (line.reservationId) {
        await consumeReservation.execute({
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
      "fulfilled",
      input.actorUserId,
    );

    await this.eventPublisher.publish([
      orderFulfilledEvent(input.tenantId, { orderId: input.orderId, actorUserId: input.actorUserId }),
    ]);
  }
}
