import { randomUUID } from "node:crypto";
import type { Trx } from "../../../http/tx-route.js";
import type { PaymentEventRepositoryPort } from "../domain/ports.js";

/**
 * spec: payments/payment - "Webhook processing is idempotent". Claims an
 * event id via the table's unique (tenant_id, provider_event_id)
 * constraint: an INSERT that returns a row means this delivery is the
 * first to see the event (proceed and apply its effect); a conflict
 * means it was already processed (no-op). Both happen in the caller's
 * transaction, so a rolled-back effect also rolls back the claim,
 * leaving the event retryable.
 */
export class KyselyPaymentEventRepository implements PaymentEventRepositoryPort {
  constructor(private readonly trx: Trx) {}

  async tryClaim(
    tenantId: string,
    providerEventId: string,
    type: string,
    paymentId: string | null,
  ): Promise<boolean> {
    const inserted = await this.trx
      .insertInto("payment_events")
      .values({
        id: randomUUID(),
        tenant_id: tenantId,
        payment_id: paymentId,
        provider_event_id: providerEventId,
        type,
      })
      .onConflict((oc) => oc.columns(["tenant_id", "provider_event_id"]).doNothing())
      .returning("id")
      .executeTakeFirst();
    return Boolean(inserted);
  }
}
