import { ORDER_STATUS_CHANGED, type OrderStatusChangedPayload } from "../../commerce/domain/events.js";
import { KyselyOrderRepository } from "../../commerce/infrastructure/order-repository.kysely.js";
import { KyselyCustomerRepository } from "../../customer/infrastructure/customer-repository.kysely.js";
import { env } from "../../../config/env.js";
import { NullEmailProvider } from "../../communication/infrastructure/null-email-provider.js";
import { ResendEmailProvider } from "../../communication/infrastructure/resend-email-provider.js";
import { SmtpEmailProvider } from "../../communication/infrastructure/smtp-email-provider.js";
import { KyselyTicketDeliveryRepository } from "../../communication/infrastructure/ticket-delivery-repository.kysely.js";
import { DeliverOrderTicketsUseCase } from "../../communication/application/deliver-order-tickets.usecase.js";
import type { EmailProviderPort } from "../../communication/domain/ports.js";
import { registerOutboxConsumer } from "../../../events/outbox-consumer-registry.js";
import { IssueEntitlementsForOrderUseCase } from "../application/issue-entitlements-for-order.usecase.js";
import { KyselyEntitlementRepository } from "./entitlement-repository.kysely.js";
import { KyselyTicketRepository } from "./ticket-repository.kysely.js";

/**
 * spec: communication/ticket-delivery - "A production-capable provider
 * takes priority over a development-only one". Resend always wins when
 * configured; SMTP (Mailpit/Mailtrap) is dev-only and never intended for
 * staging/prod (design.md - provider selection priority).
 */
export function selectEmailProvider(): EmailProviderPort {
  if (env.resendApiKey && env.resendFromEmail) return new ResendEmailProvider();
  if (env.smtpHost) return new SmtpEmailProvider();
  return new NullEmailProvider();
}

/**
 * Registers Ticketing as a consumer of `order.status_changed` (spec:
 * ticketing/entitlement - "Entitlement issuance is triggered by
 * payment"). Issues Entitlements/Tickets when an Order reaches `paid`,
 * then triggers delivery in the same flow rather than via a second event
 * (design.md - "Trigger DeliverOrderTicketsUseCase from the same
 * issuance flow"). Delivery is skipped when issuance was a no-op
 * (already issued for this Order), so a duplicate `paid` notification
 * does not re-send the email.
 */
export function registerTicketingConsumers(): void {
  registerOutboxConsumer(ORDER_STATUS_CHANGED, async (event, trx) => {
    const payload = event.payload as unknown as OrderStatusChangedPayload;
    if (payload.toStatus !== "paid") return;

    const orders = new KyselyOrderRepository(trx);
    const issue = new IssueEntitlementsForOrderUseCase(
      orders,
      new KyselyEntitlementRepository(trx),
      new KyselyTicketRepository(trx),
    );
    const result = await issue.execute({ tenantId: event.tenantId, orderId: payload.orderId });
    if (!result.issued) return;

    const order = await orders.findById(event.tenantId, payload.orderId);
    if (!order) return;
    const customer = await new KyselyCustomerRepository(trx).findById(event.tenantId, order.customerId);
    if (!customer) return;

    const deliver = new DeliverOrderTicketsUseCase(
      selectEmailProvider(),
      new KyselyTicketDeliveryRepository(trx),
    );
    await deliver.execute({
      tenantId: event.tenantId,
      orderId: order.id,
      customerEmail: customer.email,
      customerName: customer.name,
      ticketCodes: result.tickets.map((t) => t.code),
    });
  });
}
