import type { DomainEvent } from "../../../events/domain-event.js";

export const PAYMENT_SUCCEEDED = "payment.succeeded";
export const PAYMENT_FAILED = "payment.failed";
export const PAYMENT_REFUNDED = "payment.refunded";

export interface PaymentSucceededPayload {
  paymentId: string;
  orderId: string;
  amountCents: number;
  actorUserId: string;
}

export interface PaymentFailedPayload {
  paymentId: string;
  orderId: string;
  actorUserId: string;
}

export interface PaymentRefundedPayload {
  paymentId: string;
  orderId: string;
  refundedAmountCents: number;
  fullyRefunded: boolean;
  actorUserId: string;
}

export function paymentSucceededEvent(tenantId: string, payload: PaymentSucceededPayload): DomainEvent {
  return { tenantId, type: PAYMENT_SUCCEEDED, payload: { ...payload } };
}

export function paymentFailedEvent(tenantId: string, payload: PaymentFailedPayload): DomainEvent {
  return { tenantId, type: PAYMENT_FAILED, payload: { ...payload } };
}

export function paymentRefundedEvent(tenantId: string, payload: PaymentRefundedPayload): DomainEvent {
  return { tenantId, type: PAYMENT_REFUNDED, payload: { ...payload } };
}
