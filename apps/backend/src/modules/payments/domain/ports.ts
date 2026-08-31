import type { Payment, PaymentMethod, PaymentStatus } from "./payment.entity.js";

export interface CreatePaymentInput {
  id: string;
  tenantId: string;
  orderId: string;
  provider: "stripe";
  providerPaymentId: string;
  method: PaymentMethod;
  amountCents: number;
  currency: string;
}

export interface PaymentRepositoryPort {
  create(input: CreatePaymentInput): Promise<Payment>;
  findById(tenantId: string, id: string): Promise<Payment | null>;
  /** A `pending` or `succeeded` Payment for the Order, if any (spec: "Duplicate active payment is rejected"). */
  findActiveByOrderId(tenantId: string, orderId: string): Promise<Payment | null>;
  /**
   * Guarded status transition: updates the row only if its current status
   * is one of `from`. `refundedAmountCents`, when provided, is written
   * alongside the status change (used by refund transitions).
   */
  transitionStatus(
    tenantId: string,
    id: string,
    from: PaymentStatus | PaymentStatus[],
    to: PaymentStatus,
    refundedAmountCents?: number,
  ): Promise<boolean>;
  /** Appends an entry to the Payment's financial audit trail (spec: "Financial changes are audited"). */
  recordStatusHistory(
    tenantId: string,
    paymentId: string,
    fromStatus: PaymentStatus | null,
    toStatus: PaymentStatus,
    amountCents: number,
    actorUserId: string | null,
    cause: string,
  ): Promise<void>;
}

/**
 * Claims a provider webhook event before applying its effect, so a
 * duplicate delivery of the same event is a no-op (spec: "Webhook
 * processing is idempotent").
 */
export interface PaymentEventRepositoryPort {
  /** Returns true if this event id was not seen before and is now claimed; false if it was already processed. */
  tryClaim(tenantId: string, providerEventId: string, type: string, paymentId: string | null): Promise<boolean>;
}

export interface CreateIntentInput {
  tenantId: string;
  orderId: string;
  paymentId: string;
  amountCents: number;
  currency: string;
  method: PaymentMethod;
}

export interface CreateIntentResult {
  providerPaymentId: string;
  clientSecret: string;
}

export interface RefundInput {
  providerPaymentId: string;
  amountCents: number;
}

export interface RefundResult {
  providerRefundId: string;
}

/** A Payment Provider webhook event, translated to the shape this system's domain understands (spec: "Payment creation does not leak provider details"). */
export interface ProviderWebhookEvent {
  id: string;
  type: string;
  paymentIntentId: string;
  metadata: Record<string, string>;
}

/**
 * Payment Provider abstraction (PAY-001). `StripePaymentProvider` is its
 * only implementation today (design.md - Payment Provider abstraction).
 */
export interface PaymentProviderPort {
  createIntent(input: CreateIntentInput): Promise<CreateIntentResult>;
  refund(input: RefundInput): Promise<RefundResult>;
  /** Verifies the signature over the raw request bytes and returns the parsed event, or throws if invalid (PAY-003/PAY-004). */
  verifyWebhookSignature(rawBody: Buffer, signatureHeader: string): ProviderWebhookEvent;
}
