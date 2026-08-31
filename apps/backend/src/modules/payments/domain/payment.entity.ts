export class InvalidPaymentError extends Error {}

export type PaymentStatus = "pending" | "succeeded" | "failed" | "partially_refunded" | "refunded";

export type PaymentMethod = "card" | "pix";

/**
 * Guarded state machine (spec: payments/payment - "Payment lifecycle
 * states"). `partially_refunded -> partially_refunded` is intentionally
 * allowed: a second partial refund against the same Payment keeps it in
 * the same status while its refunded amount grows (design.md).
 */
export const PAYMENT_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  pending: ["succeeded", "failed"],
  succeeded: ["partially_refunded", "refunded"],
  partially_refunded: ["partially_refunded", "refunded"],
  failed: [],
  refunded: [],
};

export function isValidPaymentTransition(from: PaymentStatus, to: PaymentStatus): boolean {
  return PAYMENT_TRANSITIONS[from].includes(to);
}

export interface PaymentProps {
  id: string;
  tenantId: string;
  orderId: string;
  provider: "stripe";
  providerPaymentId: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amountCents: number;
  currency: string;
  refundedAmountCents: number;
}

/**
 * A single attempt to pay an Order (spec: payments/payment - "Payment is
 * tied to exactly one Order"). A failed attempt is terminal; a retry
 * creates a new Payment rather than reusing it.
 */
export class Payment {
  private constructor(private readonly props: PaymentProps) {}

  static create(props: PaymentProps): Payment {
    if (!Number.isInteger(props.amountCents) || props.amountCents <= 0) {
      throw new InvalidPaymentError("amountCents must be a positive integer");
    }
    if (!Number.isInteger(props.refundedAmountCents) || props.refundedAmountCents < 0) {
      throw new InvalidPaymentError("refundedAmountCents must be a non-negative integer");
    }
    if (props.refundedAmountCents > props.amountCents) {
      throw new InvalidPaymentError("refundedAmountCents cannot exceed amountCents");
    }
    if (!props.currency || props.currency.trim().length === 0) {
      throw new InvalidPaymentError("currency is required");
    }
    return new Payment(props);
  }

  get id(): string {
    return this.props.id;
  }

  get tenantId(): string {
    return this.props.tenantId;
  }

  get orderId(): string {
    return this.props.orderId;
  }

  get provider(): "stripe" {
    return this.props.provider;
  }

  get providerPaymentId(): string {
    return this.props.providerPaymentId;
  }

  get method(): PaymentMethod {
    return this.props.method;
  }

  get status(): PaymentStatus {
    return this.props.status;
  }

  get amountCents(): number {
    return this.props.amountCents;
  }

  get currency(): string {
    return this.props.currency;
  }

  get refundedAmountCents(): number {
    return this.props.refundedAmountCents;
  }

  get remainingRefundableCents(): number {
    return this.props.amountCents - this.props.refundedAmountCents;
  }
}
