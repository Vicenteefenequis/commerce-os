import type { EventPublisherPort } from "../../../shared-kernel/ports.js";
import type { OrderRepositoryPort } from "../../commerce/domain/ports.js";
import { TransitionOrderStatusUseCase } from "../../commerce/application/transition-order-status.usecase.js";
import { OrderNotFoundError } from "../../commerce/application/order-errors.js";
import type { Payment, PaymentStatus } from "../domain/payment.entity.js";
import { isValidPaymentTransition } from "../domain/payment.entity.js";
import type { PaymentProviderPort, PaymentRepositoryPort } from "../domain/ports.js";
import { paymentRefundedEvent } from "../domain/events.js";
import { InvalidPaymentTransitionError, InvalidRefundAmountError, PaymentNotFoundError } from "./payment-errors.js";

export interface RefundPaymentInput {
  tenantId: string;
  paymentId: string;
  amountCents: number;
  /** The authorized staff identity issuing the refund (spec: refund is admin-initiated). */
  actorUserId: string;
}

/**
 * spec: payments/payment - "Refund support", "Financial changes are
 * audited". Admin-initiated (design.md - gated the same way order
 * cancellation is), full or partial, reusing
 * `TransitionOrderStatusUseCase` for the Order side instead of
 * duplicating its history-recording/event-publishing.
 */
export class RefundPaymentUseCase {
  constructor(
    private readonly payments: PaymentRepositoryPort,
    private readonly provider: PaymentProviderPort,
    private readonly orders: OrderRepositoryPort,
    private readonly eventPublisher: EventPublisherPort,
  ) {}

  async execute(input: RefundPaymentInput): Promise<Payment> {
    const payment = await this.payments.findById(input.tenantId, input.paymentId);
    if (!payment) throw new PaymentNotFoundError();

    if (payment.status !== "succeeded" && payment.status !== "partially_refunded") {
      throw new InvalidPaymentTransitionError(payment.status, "refunded");
    }

    if (
      !Number.isInteger(input.amountCents) ||
      input.amountCents <= 0 ||
      input.amountCents > payment.remainingRefundableCents
    ) {
      throw new InvalidRefundAmountError();
    }

    await this.provider.refund({
      providerPaymentId: payment.providerPaymentId,
      amountCents: input.amountCents,
    });

    const newRefundedAmountCents = payment.refundedAmountCents + input.amountCents;
    const fullyRefunded = newRefundedAmountCents === payment.amountCents;
    const newStatus: PaymentStatus = fullyRefunded ? "refunded" : "partially_refunded";

    if (!isValidPaymentTransition(payment.status, newStatus)) {
      throw new InvalidPaymentTransitionError(payment.status, newStatus);
    }

    await this.payments.transitionStatus(
      input.tenantId,
      payment.id,
      payment.status,
      newStatus,
      newRefundedAmountCents,
    );
    await this.payments.recordStatusHistory(
      input.tenantId,
      payment.id,
      payment.status,
      newStatus,
      input.amountCents,
      input.actorUserId,
      "admin_refund",
    );

    const order = await this.orders.findById(input.tenantId, payment.orderId);
    if (!order) throw new OrderNotFoundError();
    if (order.status !== newStatus) {
      const transitionOrder = new TransitionOrderStatusUseCase(this.orders, this.eventPublisher);
      await transitionOrder.execute({
        tenantId: input.tenantId,
        orderId: payment.orderId,
        to: newStatus,
        actorUserId: input.actorUserId,
      });
    }

    await this.eventPublisher.publish([
      paymentRefundedEvent(input.tenantId, {
        paymentId: payment.id,
        orderId: payment.orderId,
        refundedAmountCents: newRefundedAmountCents,
        fullyRefunded,
        actorUserId: input.actorUserId,
      }),
    ]);

    const updated = await this.payments.findById(input.tenantId, payment.id);
    if (!updated) throw new PaymentNotFoundError();
    return updated;
  }
}
