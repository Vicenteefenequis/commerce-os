import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { InvalidPaymentError, Payment, isValidPaymentTransition } from "./payment.entity.js";

function makeProps(overrides: Partial<Parameters<typeof Payment.create>[0]> = {}) {
  return {
    id: randomUUID(),
    tenantId: randomUUID(),
    orderId: randomUUID(),
    provider: "stripe" as const,
    providerPaymentId: "pi_123",
    method: "card" as const,
    status: "pending" as const,
    amountCents: 5000,
    currency: "brl",
    refundedAmountCents: 0,
    ...overrides,
  };
}

describe("Payment", () => {
  it("creates a valid payment", () => {
    const payment = Payment.create(makeProps());
    expect(payment.status).toBe("pending");
    expect(payment.remainingRefundableCents).toBe(5000);
  });

  it("rejects a non-positive amount", () => {
    expect(() => Payment.create(makeProps({ amountCents: 0 }))).toThrow(InvalidPaymentError);
    expect(() => Payment.create(makeProps({ amountCents: -100 }))).toThrow(InvalidPaymentError);
  });

  it("rejects a negative refunded amount", () => {
    expect(() => Payment.create(makeProps({ refundedAmountCents: -1 }))).toThrow(InvalidPaymentError);
  });

  it("rejects a refunded amount greater than the charge amount", () => {
    expect(() => Payment.create(makeProps({ amountCents: 1000, refundedAmountCents: 1001 }))).toThrow(
      InvalidPaymentError,
    );
  });

  it("rejects a missing currency", () => {
    expect(() => Payment.create(makeProps({ currency: "" }))).toThrow(InvalidPaymentError);
  });

  it("computes remaining refundable amount", () => {
    const payment = Payment.create(makeProps({ amountCents: 1000, refundedAmountCents: 400 }));
    expect(payment.remainingRefundableCents).toBe(600);
  });
});

describe("isValidPaymentTransition", () => {
  it("allows pending to succeeded or failed", () => {
    expect(isValidPaymentTransition("pending", "succeeded")).toBe(true);
    expect(isValidPaymentTransition("pending", "failed")).toBe(true);
  });

  it("allows succeeded to refunded or partially_refunded", () => {
    expect(isValidPaymentTransition("succeeded", "refunded")).toBe(true);
    expect(isValidPaymentTransition("succeeded", "partially_refunded")).toBe(true);
  });

  it("allows a second partial refund to keep the payment partially_refunded", () => {
    expect(isValidPaymentTransition("partially_refunded", "partially_refunded")).toBe(true);
  });

  it("allows partially_refunded to become fully refunded", () => {
    expect(isValidPaymentTransition("partially_refunded", "refunded")).toBe(true);
  });

  it("rejects transitions out of a terminal state", () => {
    expect(isValidPaymentTransition("failed", "succeeded")).toBe(false);
    expect(isValidPaymentTransition("refunded", "succeeded")).toBe(false);
  });

  it("rejects going backwards", () => {
    expect(isValidPaymentTransition("succeeded", "pending")).toBe(false);
  });
});
