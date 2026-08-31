import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { CancelOrderUseCase } from "./cancel-order.usecase.js";
import { Order, OrderLine, type OrderStatus } from "../domain/order.entity.js";
import type { CreateOrderInput, OrderRepositoryPort } from "../domain/ports.js";
import { Reservation } from "../../capacity/domain/reservation.entity.js";
import type { CapacityCommitmentRepositoryPort, ReservationRepositoryPort } from "../../capacity/domain/ports.js";
import type { DomainEvent } from "../../../events/domain-event.js";
import type { EventPublisherPort } from "../../../shared-kernel/ports.js";
import { InvalidOrderTransitionError } from "./order-errors.js";
import { ORDER_CANCELLED } from "../domain/events.js";

class FakeReservationRepository implements ReservationRepositoryPort {
  public reservation: Reservation;
  public transitions: Array<{ id: string; to: string }> = [];

  constructor(tenantId: string) {
    this.reservation = Reservation.create({
      id: randomUUID(),
      tenantId,
      resourceId: randomUUID(),
      period: "2026-06-15",
      amount: 2,
      status: "pending",
      commitmentId: randomUUID(),
      expiresAt: new Date(Date.now() + 900_000),
    });
  }

  async create(): Promise<Reservation> {
    throw new Error("not used in this test");
  }
  async findById(tenantId: string, id: string): Promise<Reservation | null> {
    return this.reservation.tenantId === tenantId && this.reservation.id === id ? this.reservation : null;
  }
  async transitionStatus(_tenantId: string, id: string, _from: unknown, to: "cancelled"): Promise<boolean> {
    this.transitions.push({ id, to });
    return true;
  }
}

class FakeCommitmentRepository implements CapacityCommitmentRepositoryPort {
  public released: string[] = [];
  async tryCommit(): Promise<{ id: string } | null> {
    throw new Error("not used in this test");
  }
  async releaseCommitment(_tenantId: string, id: string): Promise<boolean> {
    this.released.push(id);
    return true;
  }
  async markConsumed(): Promise<boolean> {
    throw new Error("not used in this test");
  }
}

class FakeOrderRepository implements OrderRepositoryPort {
  public order: Order;
  public historyEntries: Array<{ from: OrderStatus | null; to: OrderStatus }> = [];

  constructor(status: OrderStatus, tenantId: string, reservationId: string | null) {
    this.order = Order.create({
      id: randomUUID(),
      tenantId,
      venueId: randomUUID(),
      status,
      lines: [
        OrderLine.create({
          id: randomUUID(),
          orderId: randomUUID(),
          tenantId,
          variantId: randomUUID(),
          name: "Ingresso",
          unitPriceCents: 1000,
          quantity: 2,
          reservationId,
        }),
      ],
    });
  }

  async create(_input: CreateOrderInput): Promise<Order> {
    throw new Error("not used in this test");
  }
  async findById(tenantId: string, id: string): Promise<Order | null> {
    return this.order.tenantId === tenantId && this.order.id === id ? this.order : null;
  }
  async findByIdempotencyKey(): Promise<Order | null> {
    throw new Error("not used in this test");
  }
  async findAllByTenant(): Promise<Order[]> {
    throw new Error("not used in this test");
  }
  async transitionStatus(
    tenantId: string,
    id: string,
    from: OrderStatus | OrderStatus[],
    to: OrderStatus,
  ): Promise<boolean> {
    const fromStatuses = Array.isArray(from) ? from : [from];
    if (this.order.tenantId !== tenantId || this.order.id !== id) return false;
    if (!fromStatuses.includes(this.order.status)) return false;
    this.order = Order.create({ ...structuredCloneOrderProps(this.order), status: to });
    return true;
  }
  async recordStatusHistory(
    _tenantId: string,
    _orderId: string,
    fromStatus: OrderStatus | null,
    toStatus: OrderStatus,
  ): Promise<void> {
    this.historyEntries.push({ from: fromStatus, to: toStatus });
  }
}

function structuredCloneOrderProps(order: Order) {
  return {
    id: order.id,
    tenantId: order.tenantId,
    venueId: order.venueId,
    idempotencyKey: order.idempotencyKey,
    lines: order.lines,
  };
}

class FakeEventPublisher implements EventPublisherPort {
  public published: DomainEvent[] = [];
  async publish(events: DomainEvent[]): Promise<void> {
    this.published.push(...events);
  }
}

describe("CancelOrderUseCase", () => {
  const tenantId = randomUUID();
  const actorUserId = randomUUID();

  it("cancels a draft order and releases its lines' reservations", async () => {
    const reservations = new FakeReservationRepository(tenantId);
    const orders = new FakeOrderRepository("draft", tenantId, reservations.reservation.id);
    const commitments = new FakeCommitmentRepository();
    const publisher = new FakeEventPublisher();
    const useCase = new CancelOrderUseCase(orders, reservations, commitments, publisher);

    await useCase.execute({ tenantId, orderId: orders.order.id, actorUserId });

    expect(orders.order.status).toBe("cancelled");
    expect(reservations.transitions).toEqual([{ id: reservations.reservation.id, to: "cancelled" }]);
    expect(commitments.released).toEqual([reservations.reservation.commitmentId]);
    expect(publisher.published.some((e) => e.type === ORDER_CANCELLED)).toBe(true);
  });

  it("rejects cancelling an order that is not draft or awaiting_payment", async () => {
    const reservations = new FakeReservationRepository(tenantId);
    const orders = new FakeOrderRepository("paid", tenantId, reservations.reservation.id);
    const useCase = new CancelOrderUseCase(
      orders,
      reservations,
      new FakeCommitmentRepository(),
      new FakeEventPublisher(),
    );

    await expect(useCase.execute({ tenantId, orderId: orders.order.id, actorUserId })).rejects.toBeInstanceOf(
      InvalidOrderTransitionError,
    );
    expect(orders.order.status).toBe("paid");
  });
});
