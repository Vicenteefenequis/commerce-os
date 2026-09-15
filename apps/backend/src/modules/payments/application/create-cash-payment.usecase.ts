import { randomUUID } from "node:crypto";
import type { OrderRepositoryPort } from "../../commerce/domain/ports.js";
import { OrderNotFoundError } from "../../commerce/application/order-errors.js";
import type { Payment } from "../domain/payment.entity.js";
import type { PaymentRepositoryPort } from "../domain/ports.js";
import { DuplicateActivePaymentError, OrderNotAwaitingPaymentError } from "./payment-errors.js";

export interface CreateCashPaymentInput {
  tenantId: string;
  orderId: string;
  /** Resolved by the caller to a real users.id - always an authenticated admin session (spec: admin/counter-sale). */
  actorUserId: string;
}

export interface CreateCashPaymentResult {
  payment: Payment;
}

/**
 * spec: payments/payment - "Supported payment methods" (cash), "Payment
 * lifecycle states" - "New cash payment starts as succeeded". Unlike
 * CreatePaymentUseCase, this never calls a Payment Provider: a cash sale
 * is settled the instant the admin action records it (design.md -
 * Decisions #2).
 */
export class CreateCashPaymentUseCase {
  constructor(
    private readonly orders: OrderRepositoryPort,
    private readonly payments: PaymentRepositoryPort,
  ) {}

  async execute(input: CreateCashPaymentInput): Promise<CreateCashPaymentResult> {
    const order = await this.orders.findById(input.tenantId, input.orderId);
    if (!order) throw new OrderNotFoundError();

    if (order.status !== "awaiting_payment") {
      throw new OrderNotAwaitingPaymentError();
    }

    const existingActive = await this.payments.findActiveByOrderId(input.tenantId, input.orderId);
    if (existingActive) {
      throw new DuplicateActivePaymentError();
    }

    const id = randomUUID();
    const payment = await this.payments.create({
      id,
      tenantId: input.tenantId,
      orderId: input.orderId,
      provider: "manual",
      providerPaymentId: id,
      method: "cash",
      amountCents: order.totalCents,
      currency: "brl",
      status: "succeeded",
    });

    await this.payments.recordStatusHistory(
      input.tenantId,
      payment.id,
      null,
      "succeeded",
      payment.amountCents,
      input.actorUserId,
      "counter_sale_cash",
    );

    return { payment };
  }
}
