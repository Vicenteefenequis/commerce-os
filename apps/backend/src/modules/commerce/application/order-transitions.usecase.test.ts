import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { TransitionOrderStatusUseCase } from "./transition-order-status.usecase.js";
import { Order, OrderLine, type OrderStatus } from "../domain/order.entity.js";
import type { CreateOrderInput, OrderRepositoryPort } from "../domain/ports.js";
import type { DomainEvent } from "../../../events/domain-event.js";
import type { EventPublisherPort } from "../../../shared-kernel/ports.js";
import { InvalidOrderTransitionError } from "./order-errors.js";
import { ORDER_STATUS_CHANGED } from "../domain/events.js";

class FakeOrderRepository implements OrderRepositoryPort {
  public order: Order;
  public historyEntries: Array<{ from: OrderStatus | null; to: OrderStatus }> = [];

  constructor(status: OrderStatus, tenantId: string) {
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
          quantity: 1,
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
    this.order = Order.create({
      id: this.order.id,
      tenantId: this.order.tenantId,
      venueId: this.order.venueId,
      status: to,
      idempotencyKey: this.order.idempotencyKey,
      lines: this.order.lines,
    });
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

class FakeEventPublisher implements EventPublisherPort {
  public published: DomainEvent[] = [];
  async publish(events: DomainEvent[]): Promise<void> {
    this.published.push(...events);
  }
}

describe("TransitionOrderStatusUseCase", () => {
  const tenantId = randomUUID();
  const actorUserId = randomUUID();

  it("transitions draft -> awaiting_payment and records history", async () => {
    const orders = new FakeOrderRepository("draft", tenantId);
    const publisher = new FakeEventPublisher();
    const useCase = new TransitionOrderStatusUseCase(orders, publisher);

    await useCase.execute({ tenantId, orderId: orders.order.id, to: "awaiting_payment", actorUserId });

    expect(orders.order.status).toBe("awaiting_payment");
    expect(orders.historyEntries).toEqual([{ from: "draft", to: "awaiting_payment" }]);
    expect(publisher.published[0]?.type).toBe(ORDER_STATUS_CHANGED);
  });

  it("rejects an invalid transition (paid -> draft) and leaves status unchanged", async () => {
    const orders = new FakeOrderRepository("paid", tenantId);
    const useCase = new TransitionOrderStatusUseCase(orders, new FakeEventPublisher());

    await expect(
      useCase.execute({ tenantId, orderId: orders.order.id, to: "draft", actorUserId }),
    ).rejects.toBeInstanceOf(InvalidOrderTransitionError);
    expect(orders.order.status).toBe("paid");
    expect(orders.historyEntries).toHaveLength(0);
  });
});
