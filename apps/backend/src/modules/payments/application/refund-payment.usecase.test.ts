import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { RefundPaymentUseCase } from "./refund-payment.usecase.js";
import { InvalidPaymentTransitionError, InvalidRefundAmountError } from "./payment-errors.js";
import { Order, OrderLine, type OrderStatus } from "../../commerce/domain/order.entity.js";
import type { CreateOrderInput, OrderRepositoryPort } from "../../commerce/domain/ports.js";
import { Payment, type PaymentStatus } from "../domain/payment.entity.js";
import type {
  CreateIntentInput,
  CreateIntentResult,
  PaymentProviderPort,
  PaymentRepositoryPort,
  ProviderWebhookEvent,
  RefundInput,
  RefundResult,
} from "../domain/ports.js";
import type { DomainEvent } from "../../../events/domain-event.js";
import type { EventPublisherPort } from "../../../shared-kernel/ports.js";
import { PAYMENT_REFUNDED } from "../domain/events.js";
import { ORDER_STATUS_CHANGED } from "../../commerce/domain/events.js";

class FakePaymentRepository implements PaymentRepositoryPort {
  public history: Array<{ from: PaymentStatus | null; to: PaymentStatus; amountCents: number }> = [];
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
    _tenantId: string,
    _id: string,
    _from: PaymentStatus | PaymentStatus[],
    to: PaymentStatus,
    refundedAmountCents?: number,
  ): Promise<boolean> {
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
      refundedAmountCents: refundedAmountCents ?? this.payment.refundedAmountCents,
    });
    return true;
  }
  async recordStatusHistory(
    _tenantId: string,
    _paymentId: string,
    fromStatus: PaymentStatus | null,
    toStatus: PaymentStatus,
    amountCents: number,
  ): Promise<void> {
    this.history.push({ from: fromStatus, to: toStatus, amountCents });
  }
}

class FakeOrderRepository implements OrderRepositoryPort {
  public transitions: Array<{ to: OrderStatus }> = [];
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
    _tenantId: string,
    _id: string,
    _from: OrderStatus | OrderStatus[],
    to: OrderStatus,
  ): Promise<boolean> {
    this.transitions.push({ to });
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

class FakePaymentProvider implements PaymentProviderPort {
  public refundCalls: RefundInput[] = [];
  async createIntent(_input: CreateIntentInput): Promise<CreateIntentResult> {
    throw new Error("not used in this test");
  }
  async refund(input: RefundInput): Promise<RefundResult> {
    this.refundCalls.push(input);
    return { providerRefundId: randomUUID() };
  }
  verifyWebhookSignature(): ProviderWebhookEvent {
    throw new Error("not used in this test");
  }
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

function makePayment(
  tenantId: string,
  orderId: string,
  status: PaymentStatus,
  refundedAmountCents = 0,
): Payment {
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
    refundedAmountCents,
  });
}

describe("RefundPaymentUseCase", () => {
  it("fully refunds a succeeded payment and refunds the order", async () => {
    const tenantId = randomUUID();
    const order = makeOrder(tenantId, "paid");
    const payment = makePayment(tenantId, order.id, "succeeded");
    const payments = new FakePaymentRepository(payment);
    const orders = new FakeOrderRepository(order);
    const provider = new FakePaymentProvider();
    const publisher = new FakeEventPublisher();
    const useCase = new RefundPaymentUseCase(payments, provider, orders, publisher);

    const result = await useCase.execute({
      tenantId,
      paymentId: payment.id,
      amountCents: 5000,
      actorUserId: randomUUID(),
    });

    expect(result.status).toBe("refunded");
    expect(orders.order.status).toBe("refunded");
    expect(provider.refundCalls[0]?.amountCents).toBe(5000);
    expect(publisher.published.map((e) => e.type)).toEqual([ORDER_STATUS_CHANGED, PAYMENT_REFUNDED]);
  });

  it("partially refunds a succeeded payment and moves the order to partially_refunded", async () => {
    const tenantId = randomUUID();
    const order = makeOrder(tenantId, "paid");
    const payment = makePayment(tenantId, order.id, "succeeded");
    const payments = new FakePaymentRepository(payment);
    const orders = new FakeOrderRepository(order);
    const useCase = new RefundPaymentUseCase(payments, new FakePaymentProvider(), orders, new FakeEventPublisher());

    const result = await useCase.execute({
      tenantId,
      paymentId: payment.id,
      amountCents: 2000,
      actorUserId: randomUUID(),
    });

    expect(result.status).toBe("partially_refunded");
    expect(result.refundedAmountCents).toBe(2000);
    expect(orders.order.status).toBe("partially_refunded");
  });

  it("allows a second partial refund up to the remaining amount without an invalid order transition", async () => {
    const tenantId = randomUUID();
    const order = makeOrder(tenantId, "partially_refunded");
    const payment = makePayment(tenantId, order.id, "partially_refunded", 2000);
    const payments = new FakePaymentRepository(payment);
    const orders = new FakeOrderRepository(order);
    const useCase = new RefundPaymentUseCase(payments, new FakePaymentProvider(), orders, new FakeEventPublisher());

    const result = await useCase.execute({
      tenantId,
      paymentId: payment.id,
      amountCents: 1000,
      actorUserId: randomUUID(),
    });

    expect(result.status).toBe("partially_refunded");
    expect(result.refundedAmountCents).toBe(3000);
    // Order was already partially_refunded, so no (invalid) self-transition was attempted.
    expect(orders.transitions).toEqual([]);
  });

  it("rejects a refund amount exceeding the remaining refundable amount", async () => {
    const tenantId = randomUUID();
    const order = makeOrder(tenantId, "paid");
    const payment = makePayment(tenantId, order.id, "succeeded");
    const useCase = new RefundPaymentUseCase(
      new FakePaymentRepository(payment),
      new FakePaymentProvider(),
      new FakeOrderRepository(order),
      new FakeEventPublisher(),
    );

    await expect(
      useCase.execute({ tenantId, paymentId: payment.id, amountCents: 6000, actorUserId: randomUUID() }),
    ).rejects.toThrow(InvalidRefundAmountError);
  });

  it("rejects refunding a payment that never succeeded", async () => {
    const tenantId = randomUUID();
    const order = makeOrder(tenantId, "awaiting_payment");
    const payment = makePayment(tenantId, order.id, "pending");
    const useCase = new RefundPaymentUseCase(
      new FakePaymentRepository(payment),
      new FakePaymentProvider(),
      new FakeOrderRepository(order),
      new FakeEventPublisher(),
    );

    await expect(
      useCase.execute({ tenantId, paymentId: payment.id, amountCents: 1000, actorUserId: randomUUID() }),
    ).rejects.toThrow(InvalidPaymentTransitionError);
  });
});
