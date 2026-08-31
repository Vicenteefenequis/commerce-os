import { randomUUID } from "node:crypto";
import type { EmailProviderPort, TicketDeliveryRepositoryPort, TicketDeliveryStatus } from "../domain/ports.js";

export interface DeliverOrderTicketsInput {
  tenantId: string;
  orderId: string;
  customerEmail: string;
  customerName: string;
  ticketCodes: string[];
}

function buildEmailBody(customerName: string, ticketCodes: string[]): string {
  const lines = ticketCodes.map((code) => `- ${code}`).join("\n");
  return `Olá ${customerName},\n\nSeus ingressos:\n${lines}\n`;
}

/**
 * spec: communication/ticket-delivery. Never throws: a provider failure
 * or an unconfigured provider is recorded as an outcome, not propagated,
 * so it cannot affect the Entitlement/Ticket issuance transaction it
 * runs alongside (spec: "Delivery failure does not affect issuance").
 */
export class DeliverOrderTicketsUseCase {
  constructor(
    private readonly emailProvider: EmailProviderPort,
    private readonly deliveries: TicketDeliveryRepositoryPort,
  ) {}

  async execute(input: DeliverOrderTicketsInput): Promise<TicketDeliveryStatus> {
    let status: TicketDeliveryStatus;
    try {
      const result = await this.emailProvider.send({
        to: input.customerEmail,
        subject: "Seus ingressos",
        body: buildEmailBody(input.customerName, input.ticketCodes),
      });
      status = result.status;
    } catch {
      status = "failed";
    }

    await this.deliveries.record({
      id: randomUUID(),
      tenantId: input.tenantId,
      orderId: input.orderId,
      status,
    });

    return status;
  }
}
