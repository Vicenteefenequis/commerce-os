import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { FulfillOrderUseCase } from "./fulfill-order.usecase.js";
import { Order, OrderLine, type OrderStatus } from "../domain/order.entity.js";
import type { CreateOrderInput, OrderRepositoryPort } from "../domain/ports.js";
import { Reservation, type ReservationStatus } from "../../capacity/domain/reservation.entity.js";
import type { CapacityCommitmentRepositoryPort, ReservationRepositoryPort } from "../../capacity/domain/ports.js";
import type { DomainEvent } from "../../../events/domain-event.js";
import type { EventPublisherPort } from "../../../shared-kernel/ports.js";
import { InvalidOrderTransitionError } from "./order-errors.js";
import { InvalidReservationTransitionError } from "../../capacity/application/reservation-errors.js";
import { ORDER_FULFILLED } from "../domain/events.js";

class FakeReservationRepository implements ReservationRepositoryPort {
  public reservation: Reservation;
  public transitions: Array<{ id: string; to: string }> = [];

  constructor(tenantId: string, status: ReservationStatus) {
    this.reservation = Reservation.create({
      id: randomUUID(),
      tenantId,
      resourceId: randomUUID(),
      period: "2026-06-15",
      amount: 2,
      status,
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
  async transitionStatus(
    tenantId: string,
    id: string,
    from: ReservationStatus | ReservationStatus[],
    to: ReservationStatus,
  ): Promise<boolean> {
    const fromStatuses = Array.isArray(from) ? from : [from];
    if (this.reservation.tenantId !== tenantId || this.reservation.id !== id) return false;
    if (!fromStatuses.includes(this.reservation.status)) return false;
    this.reservation = Reservation.create({ ...structuredCloneReservationProps(this.reservation), status: to });
    this.transitions.push({ id, to });
    return true;
  }
}

function structuredCloneReservationProps(reservation: Reservation) {
  return {
    id: reservation.id,
    tenantId: reservation.tenantId,
    resourceId: reservation.resourceId,
    period: reservation.period,
    amount: reservation.amount,
    commitmentId: reservation.commitmentId,
    expiresAt: reservation.expiresAt,
  };
}

class FakeCommitmentRepository implements CapacityCommitmentRepositoryPort {
  public consumed: string[] = [];
  async tryCommit(): Promise<{ id: string } | null> {
    throw new Error("not used in this test");
  }
  async releaseCommitment(): Promise<boolean> {
    throw new Error("not used in this test");
  }
  async markConsumed(_tenantId: string, id: string): Promise<boolean> {
    this.consumed.push(id);
    return true;
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
      lines: reservationId
        ? [
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
          ]
        : [
            OrderLine.create({
              id: randomUUID(),
              orderId: randomUUID(),
              tenantId,
              variantId: randomUUID(),
              name: "Camiseta",
              unitPriceCents: 5000,
              quantity: 1,
              reservationId: null,
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

describe("FulfillOrderUseCase", () => {
  const tenantId = randomUUID();
  const actorUserId = randomUUID();

  it("fulfills a paid order and consumes its lines' confirmed reservations", async () => {
    const reservations = new FakeReservationRepository(tenantId, "confirmed");
    const orders = new FakeOrderRepository("paid", tenantId, reservations.reservation.id);
    const commitments = new FakeCommitmentRepository();
    const publisher = new FakeEventPublisher();
    const useCase = new FulfillOrderUseCase(orders, reservations, commitments, publisher);

    await useCase.execute({ tenantId, orderId: orders.order.id, actorUserId });

    expect(orders.order.status).toBe("fulfilled");
    expect(reservations.transitions).toEqual([{ id: reservations.reservation.id, to: "consumed" }]);
    expect(commitments.consumed).toEqual([reservations.reservation.commitmentId]);
    expect(publisher.published.some((e) => e.type === ORDER_FULFILLED)).toBe(true);
    expect(orders.historyEntries).toEqual([{ from: "paid", to: "fulfilled" }]);
  });

  it("fulfills a paid order with no capacity-backed lines directly", async () => {
    const reservations = new FakeReservationRepository(tenantId, "confirmed");
    const orders = new FakeOrderRepository("paid", tenantId, null);
    const commitments = new FakeCommitmentRepository();
    const publisher = new FakeEventPublisher();
    const useCase = new FulfillOrderUseCase(orders, reservations, commitments, publisher);

    await useCase.execute({ tenantId, orderId: orders.order.id, actorUserId });

    expect(orders.order.status).toBe("fulfilled");
    expect(reservations.transitions).toEqual([]);
    expect(commitments.consumed).toEqual([]);
  });

  it.each<OrderStatus>(["draft", "awaiting_payment", "fulfilled", "refunded", "partially_refunded", "cancelled", "expired"])(
    "rejects fulfilling an order that is '%s'",
    async (status) => {
      const reservations = new FakeReservationRepository(tenantId, "confirmed");
      const orders = new FakeOrderRepository(status, tenantId, reservations.reservation.id);
      const useCase = new FulfillOrderUseCase(
        orders,
        reservations,
        new FakeCommitmentRepository(),
        new FakeEventPublisher(),
      );

      await expect(useCase.execute({ tenantId, orderId: orders.order.id, actorUserId })).rejects.toBeInstanceOf(
        InvalidOrderTransitionError,
      );
      expect(orders.order.status).toBe(status);
    },
  );

  it("surfaces an error when a line's reservation is not confirmed, instead of skipping or partially fulfilling", async () => {
    const reservations = new FakeReservationRepository(tenantId, "pending");
    const orders = new FakeOrderRepository("paid", tenantId, reservations.reservation.id);
    const useCase = new FulfillOrderUseCase(
      orders,
      reservations,
      new FakeCommitmentRepository(),
      new FakeEventPublisher(),
    );

    await expect(useCase.execute({ tenantId, orderId: orders.order.id, actorUserId })).rejects.toBeInstanceOf(
      InvalidReservationTransitionError,
    );
    expect(reservations.reservation.status).toBe("pending");
  });
});
