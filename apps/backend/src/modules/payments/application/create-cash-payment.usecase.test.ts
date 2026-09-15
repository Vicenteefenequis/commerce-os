import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { CreateCashPaymentUseCase } from "./create-cash-payment.usecase.js";
import { DuplicateActivePaymentError, OrderNotAwaitingPaymentError } from "./payment-errors.js";
import { OrderNotFoundError } from "../../commerce/application/order-errors.js";
import { Order, OrderLine, type OrderStatus } from "../../commerce/domain/order.entity.js";
import type { CreateOrderInput, OrderRepositoryPort } from "../../commerce/domain/ports.js";
import { Payment, type PaymentStatus } from "../domain/payment.entity.js";
import type { CreatePaymentInput as RepoCreatePaymentInput, PaymentRepositoryPort } from "../domain/ports.js";

function makeOrder(tenantId: string, status: OrderStatus, totalCents: number): Order {
  return Order.create({
    id: randomUUID(),
    tenantId,
    venueId: randomUUID(),
    customerId: randomUUID(),
    status,
    channel: "counter",
    lines: [
      OrderLine.create({
        id: randomUUID(),
        orderId: randomUUID(),
        tenantId,
        variantId: randomUUID(),
        name: "Ingresso",
        unitPriceCents: totalCents,
        quantity: 1,
      }),
    ],
  });
}

class FakeOrderRepository implements OrderRepositoryPort {
  constructor(private readonly order: Order | null) {}
  async findById(tenantId: string, id: string): Promise<Order | null> {
    return this.order && this.order.tenantId === tenantId && this.order.id === id ? this.order : null;
  }
  async create(_input: CreateOrderInput): Promise<Order> {
    throw new Error("not used in this test");
  }
  async findByIdempotencyKey(): Promise<Order | null> {
    throw new Error("not used in this test");
  }
  async findAllByTenant(): Promise<Order[]> {
    throw new Error("not used in this test");
  }
  async transitionStatus(): Promise<boolean> {
    throw new Error("not used in this test");
  }
  async recordStatusHistory(): Promise<void> {}
}

class FakePaymentRepository implements PaymentRepositoryPort {
  public created: Payment[] = [];
  public history: Array<{ from: PaymentStatus | null; to: PaymentStatus; cause: string }> = [];
  constructor(private readonly activeByOrder: Payment | null = null) {}

  async create(input: RepoCreatePaymentInput): Promise<Payment> {
    const payment = Payment.create({
      id: input.id,
      tenantId: input.tenantId,
      orderId: input.orderId,
      provider: input.provider,
      providerPaymentId: input.providerPaymentId,
      method: input.method,
      status: input.status ?? "pending",
      amountCents: input.amountCents,
      currency: input.currency,
      refundedAmountCents: 0,
    });
    this.created.push(payment);
    return payment;
  }
  async findById(): Promise<Payment | null> {
    throw new Error("not used in this test");
  }
  async findActiveByOrderId(): Promise<Payment | null> {
    return this.activeByOrder;
  }
  async findMostRecentByOrderId(): Promise<Payment | null> {
    return this.activeByOrder;
  }
  async transitionStatus(): Promise<boolean> {
    throw new Error("not used in this test");
  }
  async recordStatusHistory(
    _tenantId: string,
    _paymentId: string,
    fromStatus: PaymentStatus | null,
    toStatus: PaymentStatus,
    _amountCents: number,
    _actorUserId: string | null,
    cause: string,
  ): Promise<void> {
    this.history.push({ from: fromStatus, to: toStatus, cause });
  }
}

describe("CreateCashPaymentUseCase", () => {
  it("creates a Payment already succeeded, without a Payment Provider, for an awaiting_payment order", async () => {
    const tenantId = randomUUID();
    const order = makeOrder(tenantId, "awaiting_payment", 5000);
    const payments = new FakePaymentRepository(null);
    const useCase = new CreateCashPaymentUseCase(new FakeOrderRepository(order), payments);

    const result = await useCase.execute({ tenantId, orderId: order.id, actorUserId: randomUUID() });

    expect(result.payment.status).toBe("succeeded");
    expect(result.payment.method).toBe("cash");
    expect(result.payment.provider).toBe("manual");
    expect(result.payment.amountCents).toBe(5000);
    expect(payments.history).toEqual([{ from: null, to: "succeeded", cause: "counter_sale_cash" }]);
  });

  it("rejects when the order does not exist", async () => {
    const tenantId = randomUUID();
    const useCase = new CreateCashPaymentUseCase(new FakeOrderRepository(null), new FakePaymentRepository());
    await expect(useCase.execute({ tenantId, orderId: randomUUID(), actorUserId: randomUUID() })).rejects.toThrow(
      OrderNotFoundError,
    );
  });

  it("rejects when the order is not awaiting_payment", async () => {
    const tenantId = randomUUID();
    const order = makeOrder(tenantId, "draft", 5000);
    const useCase = new CreateCashPaymentUseCase(new FakeOrderRepository(order), new FakePaymentRepository());
    await expect(useCase.execute({ tenantId, orderId: order.id, actorUserId: randomUUID() })).rejects.toThrow(
      OrderNotAwaitingPaymentError,
    );
  });

  it("rejects when the order already has an active payment", async () => {
    const tenantId = randomUUID();
    const order = makeOrder(tenantId, "awaiting_payment", 5000);
    const existing = Payment.create({
      id: randomUUID(),
      tenantId,
      orderId: order.id,
      provider: "stripe",
      providerPaymentId: "pi_existing",
      method: "card",
      status: "pending",
      amountCents: 5000,
      currency: "brl",
      refundedAmountCents: 0,
    });
    const useCase = new CreateCashPaymentUseCase(new FakeOrderRepository(order), new FakePaymentRepository(existing));
    await expect(useCase.execute({ tenantId, orderId: order.id, actorUserId: randomUUID() })).rejects.toThrow(
      DuplicateActivePaymentError,
    );
  });
});
