import { randomUUID } from "node:crypto";
import type {
  EmailAttachment,
  EmailProviderPort,
  QrCodeRendererPort,
  TicketDeliveryRepositoryPort,
  TicketDeliveryStatus,
} from "../domain/ports.js";

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
 * spec: communication/ticket-delivery - "Ticket email includes each
 * Ticket's QR image". Each code renders independently; one that fails
 * to render degrades to that code as text only, so a single bad render
 * never blocks the others or the delivery attempt itself (spec: "QR
 * generation failure does not block delivery of the code").
 *
 * QR images are embedded as `cid:`-referenced inline attachments, not
 * `data:` URIs: Gmail and most webmail clients strip `data:` image
 * sources from received HTML as a phishing/tracking mitigation, so the
 * image renders as blank space there even though it displays fine in a
 * raw-HTML viewer like Mailpit.
 */
async function buildEmail(
  qrRenderer: QrCodeRendererPort,
  customerName: string,
  ticketCodes: string[],
): Promise<{ html: string; attachments: EmailAttachment[] }> {
  const attachments: EmailAttachment[] = [];
  const items = await Promise.all(
    ticketCodes.map(async (code, index) => {
      try {
        const png = await qrRenderer.render(code);
        const contentId = `ticket-qr-${index}`;
        attachments.push({ filename: `ticket-${code}.png`, content: png, contentId, contentType: "image/png" });
        return `<p><img src="cid:${contentId}" alt="QR do ingresso ${code}" width="200" height="200" /><br />${code}</p>`;
      } catch {
        return `<p>${code}</p>`;
      }
    }),
  );
  return { html: `<p>Olá ${customerName},</p><p>Seus ingressos:</p>${items.join("")}`, attachments };
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
    private readonly qrRenderer: QrCodeRendererPort,
  ) {}

  async execute(input: DeliverOrderTicketsInput): Promise<TicketDeliveryStatus> {
    let status: TicketDeliveryStatus;
    try {
      const { html, attachments } = await buildEmail(this.qrRenderer, input.customerName, input.ticketCodes);
      const result = await this.emailProvider.send({
        to: input.customerEmail,
        subject: "Seus ingressos",
        body: buildEmailBody(input.customerName, input.ticketCodes),
        html,
        attachments,
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
