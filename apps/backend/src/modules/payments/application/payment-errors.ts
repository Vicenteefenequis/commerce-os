import type { PaymentStatus } from "../domain/payment.entity.js";

export class PaymentNotFoundError extends Error {
  constructor() {
    super("payment not found");
  }
}

/** spec: payments/payment - "Duplicate active payment is rejected". */
export class DuplicateActivePaymentError extends Error {
  constructor() {
    super("order already has an active payment");
  }
}

/** A Payment can only be created for an Order sitting in `awaiting_payment`. */
export class OrderNotAwaitingPaymentError extends Error {
  constructor() {
    super("order is not awaiting payment");
  }
}

export class InvalidPaymentTransitionError extends Error {
  constructor(currentStatus: PaymentStatus, attempted: PaymentStatus) {
    super(`cannot transition payment from '${currentStatus}' to '${attempted}'`);
  }
}

export class InvalidRefundAmountError extends Error {
  constructor() {
    super("refund amount must be positive and not exceed the remaining refundable amount");
  }
}

export class InvalidWebhookSignatureError extends Error {
  constructor() {
    super("invalid webhook signature");
  }
}
