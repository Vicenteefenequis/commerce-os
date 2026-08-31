import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { ProcessStripeWebhookUseCase } from "./process-stripe-webhook.usecase.js";
import { Order, OrderLine, type OrderStatus } from "../../commerce/domain/order.entity.js";
import type { CreateOrderInput, OrderRepositoryPort } from "../../commerce/domain/ports.js";
import { Payment, type PaymentStatus } from "../domain/payment.entity.js";
import type {
  PaymentEventRepositoryPort,
  PaymentRepositoryPort,
  ProviderWebhookEvent,
} from "../domain/ports.js";
import type { DomainEvent } from "../../../events/domain-event.js";
import type { EventPublisherPort } from "../../../shared-kernel/ports.js";
import { PAYMENT_FAILED, PAYMENT_SUCCEEDED } from "../domain/events.js";
import { ORDER_STATUS_CHANGED } from "../../commerce/domain/events.js";

class FakeEventRepository implements PaymentEventRepositoryPort {
  private seen = new Set<string>();
  public claims: string[] = [];
  async tryClaim(_tenantId: string, providerEventId: string): Promise<boolean> {
    this.claims.push(providerEventId);
    if (this.seen.has(providerEventId)) return false;
    this.seen.add(providerEventId);
    return true;
  }
}

class FakePaymentRepository implements PaymentRepositoryPort {
  public history: Array<{ from: PaymentStatus | null; to: PaymentStatus }> = [];
  public transitions: Array<{ from: PaymentStatus | PaymentStatus[]; to: PaymentStatus }> = [];
  constructor(public payment: Payment) {}

  async create(): Promise<Payment> {
    throw new Error("not used in this test");
  }
  async findById(tenantId: string, id: string): Promise<Payment | null> {
    return this.payment.tenantId === tenantId && this.payment.id === id ? this.payment : null;
  }
  async findActiveByOrderId(): Promise<Payment | null> {
    throw new Error("not used in this test");
  }
  async transitionStatus(
    tenantId: string,
    id: string,
    from: PaymentStatus | PaymentStatus[],
    to: PaymentStatus,
  ): Promise<boolean> {
    this.transitions.push({ from, to });
    this.payment = Payment.create({
      id: this.payment.id,
      tenantId: this.payment.tenantId,
      orderId: this.payment.orderId,
      provider: this.payment.provider,
      providerPaymentId: this.payment.providerPaymentId,
      method: this.payment.method,
      status: to,
      amountCents: this.payment.amountCents,
      currency: this.payment.currency,
      refundedAmountCents: this.payment.refundedAmountCents,
    });
    return true;
  }
  async recordStatusHistory(
    _tenantId: string,
    _paymentId: string,
    fromStatus: PaymentStatus | null,
    toStatus: PaymentStatus,
  ): Promise<void> {
    this.history.push({ from: fromStatus, to: toStatus });
  }
}

class FakeOrderRepository implements OrderRepositoryPort {
  public transitions: Array<{ from: OrderStatus; to: OrderStatus }> = [];
  constructor(public order: Order) {}

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
    this.transitions.push({ from: this.order.status, to });
    this.order = Order.create({
      id: this.order.id,
      tenantId: this.order.tenantId,
      venueId: this.order.venueId,
      status: to,
      lines: this.order.lines,
    });
    return true;
  }
  async recordStatusHistory(): Promise<void> {}
}

class FakeEventPublisher implements EventPublisherPort {
  public published: DomainEvent[] = [];
  async publish(events: DomainEvent[]): Promise<void> {
    this.published.push(...events);
  }
}

function makeOrder(tenantId: string, status: OrderStatus): Order {
  return Order.create({
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
        unitPriceCents: 5000,
        quantity: 1,
      }),
    ],
  });
}

function makePayment(tenantId: string, orderId: string, status: PaymentStatus = "pending"): Payment {
  return Payment.create({
    id: randomUUID(),
    tenantId,
    orderId,
    provider: "stripe",
    providerPaymentId: "pi_123",
    method: "card",
    status,
    amountCents: 5000,
    currency: "brl",
    refundedAmountCents: 0,
  });
}

function makeEvent(overrides: Partial<ProviderWebhookEvent> & { metadata: Record<string, string> }): ProviderWebhookEvent {
  return {
    id: randomUUID(),
    type: "payment_intent.succeeded",
    paymentIntentId: "pi_123",
    ...overrides,
  };
}

describe("ProcessStripeWebhookUseCase", () => {
  it("transitions a pending payment to succeeded and the order to paid", async () => {
    const tenantId = randomUUID();
    const order = makeOrder(tenantId, "awaiting_payment");
    const payment = makePayment(tenantId, order.id, "pending");
    const payments = new FakePaymentRepository(payment);
    const orders = new FakeOrderRepository(order);
    const publisher = new FakeEventPublisher();
    const useCase = new ProcessStripeWebhookUseCase(new FakeEventRepository(), payments, orders, publisher);

    await useCase.execute({
      tenantId,
      event: makeEvent({ type: "payment_intent.succeeded", metadata: { paymentId: payment.id } }),
      actorUserId: randomUUID(),
    });

    expect(payments.payment.status).toBe("succeeded");
    expect(orders.order.status).toBe("paid");
    expect(publisher.published.map((e) => e.type)).toEqual([ORDER_STATUS_CHANGED, PAYMENT_SUCCEEDED]);
  });

  it("transitions a pending payment to failed and leaves the order untouched", async () => {
    const tenantId = randomUUID();
    const order = makeOrder(tenantId, "awaiting_payment");
    const payment = makePayment(tenantId, order.id, "pending");
    const payments = new FakePaymentRepository(payment);
    const orders = new FakeOrderRepository(order);
    const publisher = new FakeEventPublisher();
    const useCase = new ProcessStripeWebhookUseCase(new FakeEventRepository(), payments, orders, publisher);

    await useCase.execute({
      tenantId,
      event: makeEvent({ type: "payment_intent.payment_failed", metadata: { paymentId: payment.id } }),
      actorUserId: randomUUID(),
    });

    expect(payments.payment.status).toBe("failed");
    expect(orders.order.status).toBe("awaiting_payment");
    expect(orders.transitions).toEqual([]);
    expect(publisher.published.map((e) => e.type)).toEqual([PAYMENT_FAILED]);
  });

  it("does not double-process a duplicate webhook delivery", async () => {
    const tenantId = randomUUID();
    const order = makeOrder(tenantId, "awaiting_payment");
    const payment = makePayment(tenantId, order.id, "pending");
    const payments = new FakePaymentRepository(payment);
    const orders = new FakeOrderRepository(order);
    const publisher = new FakeEventPublisher();
    const events = new FakeEventRepository();
    const useCase = new ProcessStripeWebhookUseCase(events, payments, orders, publisher);
    const event = makeEvent({
      id: "evt_dup",
      type: "payment_intent.succeeded",
      metadata: { paymentId: payment.id },
    });

    await useCase.execute({ tenantId, event, actorUserId: randomUUID() });
    await useCase.execute({ tenantId, event, actorUserId: randomUUID() });

    expect(payments.transitions).toHaveLength(1);
    expect(orders.transitions).toHaveLength(1);
    expect(publisher.published).toHaveLength(2);
  });

  it("ignores an event with no matching payment metadata", async () => {
    const tenantId = randomUUID();
    const order = makeOrder(tenantId, "awaiting_payment");
    const payment = makePayment(tenantId, order.id, "pending");
    const payments = new FakePaymentRepository(payment);
    const orders = new FakeOrderRepository(order);
    const publisher = new FakeEventPublisher();
    const useCase = new ProcessStripeWebhookUseCase(new FakeEventRepository(), payments, orders, publisher);

    await useCase.execute({
      tenantId,
      event: makeEvent({ type: "payment_intent.succeeded", metadata: {} }),
      actorUserId: randomUUID(),
    });

    expect(payments.payment.status).toBe("pending");
    expect(publisher.published).toEqual([]);
  });
});
