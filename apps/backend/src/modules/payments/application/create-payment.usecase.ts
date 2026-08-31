import { randomUUID } from "node:crypto";
import type { OrderRepositoryPort } from "../../commerce/domain/ports.js";
import { OrderNotFoundError } from "../../commerce/application/order-errors.js";
import type { Payment, PaymentMethod } from "../domain/payment.entity.js";
import type { PaymentProviderPort, PaymentRepositoryPort } from "../domain/ports.js";
import { DuplicateActivePaymentError, OrderNotAwaitingPaymentError } from "./payment-errors.js";

export interface CreatePaymentInput {
  tenantId: string;
  orderId: string;
  method: PaymentMethod;
  /** Resolved by the caller to a real users.id - see commerce/application/create-order.usecase.ts's actorUserId doc. */
  actorUserId: string;
}

export interface CreatePaymentResult {
  payment: Payment;
  clientSecret: string;
}

/**
 * spec: payments/payment - "Supported payment methods", "Payment lifecycle
 * states", "Duplicate active payment is rejected". Creates a Payment
 * attempt for an Order that is `awaiting_payment`, backed by a Payment
 * Provider intent the client uses to actually collect payment details.
 */
export class CreatePaymentUseCase {
  constructor(
    private readonly orders: OrderRepositoryPort,
    private readonly payments: PaymentRepositoryPort,
    private readonly provider: PaymentProviderPort,
  ) {}

  async execute(input: CreatePaymentInput): Promise<CreatePaymentResult> {
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
    const intent = await this.provider.createIntent({
      tenantId: input.tenantId,
      orderId: input.orderId,
      paymentId: id,
      amountCents: order.totalCents,
      currency: "brl",
      method: input.method,
    });

    const payment = await this.payments.create({
      id,
      tenantId: input.tenantId,
      orderId: input.orderId,
      provider: "stripe",
      providerPaymentId: intent.providerPaymentId,
      method: input.method,
      amountCents: order.totalCents,
      currency: "brl",
    });

    await this.payments.recordStatusHistory(
      input.tenantId,
      payment.id,
      null,
      "pending",
      payment.amountCents,
      input.actorUserId,
      "payment_created",
    );

    return { payment, clientSecret: intent.clientSecret };
  }
}
