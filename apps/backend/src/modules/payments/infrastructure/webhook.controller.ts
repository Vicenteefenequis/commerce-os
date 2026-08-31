import type { NextFunction, Request, Response } from "express";
import { sql } from "kysely";
import { db } from "../../../db/kysely.js";
import { OutboxEventPublisher } from "../../../events/outbox-publisher.js";
import { KyselyOrderRepository } from "../../commerce/infrastructure/order-repository.kysely.js";
import { ensureCheckoutSystemUserId } from "../../commerce/infrastructure/system-user.kysely.js";
import { KyselyReservationRepository } from "../../capacity/infrastructure/reservation-repository.kysely.js";
import { ProcessStripeWebhookUseCase } from "../application/process-stripe-webhook.usecase.js";
import { InvalidWebhookSignatureError } from "../application/payment-errors.js";
import { KyselyPaymentEventRepository } from "./payment-event-repository.kysely.js";
import { KyselyPaymentRepository } from "./payment-repository.kysely.js";
import { StripePaymentProvider } from "./stripe-payment-provider.js";

/**
 * Not a `txRoute*` handler: signature verification (PAY-003/PAY-004)
 * must happen BEFORE any tenant is known or any transaction is opened -
 * an invalid signature is rejected with no state change at all, not
 * just no DB write. The tenant only becomes known from the verified
 * event's own metadata (set at PaymentIntent creation - see
 * create-payment.usecase.ts), so `app.tenant_id` is set manually here
 * instead of via `txRouteWithTenant`, which resolves tenant from the
 * request before the handler runs.
 */
export async function stripeWebhookRoute(req: Request, res: Response, next: NextFunction): Promise<void> {
  const signatureHeader = req.header("stripe-signature");
  if (!signatureHeader || !req.rawBody) {
    res.status(400).json({ error: "missing stripe-signature header or request body" });
    return;
  }

  const provider = new StripePaymentProvider();

  let event;
  try {
    event = provider.verifyWebhookSignature(req.rawBody, signatureHeader);
  } catch (err) {
    if (err instanceof InvalidWebhookSignatureError) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
    return;
  }

  const tenantId = event.metadata.tenantId;
  if (!tenantId) {
    // Not an event this system created (no tenantId metadata) - nothing to process.
    res.status(200).json({ received: true });
    return;
  }

  try {
    await db.transaction().execute(async (trx) => {
      await sql`select set_config('app.tenant_id', ${tenantId}, true)`.execute(trx);
      const actorUserId = await ensureCheckoutSystemUserId(trx, tenantId);
      const useCase = new ProcessStripeWebhookUseCase(
        new KyselyPaymentEventRepository(trx),
        new KyselyPaymentRepository(trx),
        new KyselyOrderRepository(trx),
        new KyselyReservationRepository(trx),
        new OutboxEventPublisher(trx),
      );
      await useCase.execute({ tenantId, event, actorUserId });
    });
    res.status(200).json({ received: true });
  } catch (err) {
    next(err);
  }
}
