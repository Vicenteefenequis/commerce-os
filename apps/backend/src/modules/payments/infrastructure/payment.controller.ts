import type { Request } from "express";
import type { Trx, TxResult } from "../../../http/tx-route.js";
import { OutboxEventPublisher } from "../../../events/outbox-publisher.js";
import { KyselyOrderRepository } from "../../commerce/infrastructure/order-repository.kysely.js";
import { ensureCheckoutSystemUserId } from "../../commerce/infrastructure/system-user.kysely.js";
import { OrderNotFoundError } from "../../commerce/application/order-errors.js";
import { CreatePaymentUseCase } from "../application/create-payment.usecase.js";
import { RefundPaymentUseCase } from "../application/refund-payment.usecase.js";
import {
  DuplicateActivePaymentError,
  InvalidPaymentTransitionError,
  InvalidRefundAmountError,
  OrderNotAwaitingPaymentError,
  PaymentNotFoundError,
} from "../application/payment-errors.js";
import type { Payment, PaymentMethod } from "../domain/payment.entity.js";
import { KyselyPaymentRepository } from "./payment-repository.kysely.js";
import { StripePaymentProvider } from "./stripe-payment-provider.js";

function serializePayment(payment: Payment) {
  return {
    id: payment.id,
    orderId: payment.orderId,
    provider: payment.provider,
    method: payment.method,
    status: payment.status,
    amountCents: payment.amountCents,
    currency: payment.currency,
    refundedAmountCents: payment.refundedAmountCents,
  };
}

/**
 * Public like checkout (no requireAuth): the payment page (apps/web) has
 * no authenticated session for a guest customer. tenantId resolution
 * mirrors checkout.controller.ts.
 */
export async function createPaymentIntentController(req: Request, trx: Trx): Promise<TxResult> {
  const { id: orderId } = req.params as { id: string };
  const { method } = req.body as { tenantId?: string; method?: PaymentMethod };

  const identity = req.identity;
  const tenantId = identity?.tenantId ?? ((req.body as { tenantId?: string })?.tenantId ?? "");

  if (!tenantId || (method !== "card" && method !== "pix")) {
    return { status: 400, body: { error: "tenantId and a method of 'card' or 'pix' are required" } };
  }

  const actorUserId = identity?.userId ?? (await ensureCheckoutSystemUserId(trx, tenantId));

  const useCase = new CreatePaymentUseCase(
    new KyselyOrderRepository(trx),
    new KyselyPaymentRepository(trx),
    new StripePaymentProvider(),
  );

  try {
    const { payment, clientSecret } = await useCase.execute({ tenantId, orderId, method, actorUserId });
    return { status: 201, body: { ...serializePayment(payment), clientSecret } };
  } catch (err) {
    if (err instanceof OrderNotFoundError) return { status: 404, body: { error: err.message } };
    if (err instanceof OrderNotAwaitingPaymentError || err instanceof DuplicateActivePaymentError) {
      return { status: 409, body: { error: err.message } };
    }
    throw err;
  }
}

/**
 * Public, no requireAuth (spec: "Payment status can be checked without
 * an authenticated session"). Returns status only - never the full
 * Payment or Order - so a guest customer's payment page can confirm its
 * own outcome without the browser redirect being trusted on its own
 * (design.md - Redirect vs. webhook).
 */
export async function getPaymentStatusController(req: Request, trx: Trx): Promise<TxResult> {
  const { id: paymentId } = req.params as { id: string };
  const identity = req.identity;
  const tenantId = identity?.tenantId ?? ((req.query as { tenantId?: string })?.tenantId ?? "");

  if (!tenantId) {
    return { status: 400, body: { error: "tenantId is required" } };
  }

  const payment = await new KyselyPaymentRepository(trx).findById(tenantId, paymentId);
  if (!payment) return { status: 404, body: { error: "payment not found" } };

  return { status: 200, body: { status: payment.status } };
}

/** Staff-authorized, same posture as order cancellation (spec: refund is admin-initiated). */
export async function refundPaymentController(req: Request, trx: Trx): Promise<TxResult> {
  const identity = req.identity;
  if (!identity) return { status: 401, body: { error: "authentication required" } };

  const { id: paymentId } = req.params as { id: string };
  const { amountCents } = req.body as { amountCents?: number };
  if (!Number.isInteger(amountCents) || (amountCents as number) <= 0) {
    return { status: 400, body: { error: "amountCents must be a positive integer" } };
  }

  const useCase = new RefundPaymentUseCase(
    new KyselyPaymentRepository(trx),
    new StripePaymentProvider(),
    new KyselyOrderRepository(trx),
    new OutboxEventPublisher(trx),
  );

  try {
    const payment = await useCase.execute({
      tenantId: identity.tenantId,
      paymentId,
      amountCents: amountCents as number,
      actorUserId: identity.userId,
    });
    return { status: 200, body: serializePayment(payment) };
  } catch (err) {
    if (err instanceof PaymentNotFoundError || err instanceof OrderNotFoundError) {
      return { status: 404, body: { error: err.message } };
    }
    if (err instanceof InvalidPaymentTransitionError || err instanceof InvalidRefundAmountError) {
      return { status: 409, body: { error: err.message } };
    }
    throw err;
  }
}
