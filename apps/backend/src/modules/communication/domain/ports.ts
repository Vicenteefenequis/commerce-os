export interface EmailAttachment {
  filename: string;
  content: Buffer;
  /** Referenced from `html` as `cid:<contentId>` to embed inline (e.g. a Ticket's QR image) rather than as a downloadable attachment. */
  contentId: string;
  contentType?: string;
}

export interface SendEmailInput {
  to: string;
  subject: string;
  body: string;
  /** Optional HTML alternative (e.g. embedding a Ticket's QR image); providers that support it send both. */
  html?: string;
  /**
   * Inline images referenced by `html` via `cid:`. Embedding QR images as
   * base64 `data:` URIs instead would be simpler, but Gmail and most
   * webmail clients strip `data:` image sources from received HTML email
   * as a phishing/tracking mitigation - the image silently renders as
   * blank space. `cid:`-referenced inline attachments are the form every
   * major client actually renders.
   */
  attachments?: EmailAttachment[];
}

export type EmailSendResult =
  | { status: "sent" }
  | { status: "failed"; reason: string }
  | { status: "not_configured" };

/**
 * Email sending abstraction (design.md - mirrors PaymentProviderPort's
 * shape). No adapter is wired to a real provider in this change;
 * `NullEmailProvider` is the only implementation, always returning
 * `not_configured` without throwing.
 */
export interface EmailProviderPort {
  send(input: SendEmailInput): Promise<EmailSendResult>;
}

export type TicketDeliveryStatus = "sent" | "failed" | "not_configured";

export interface RecordTicketDeliveryInput {
  id: string;
  tenantId: string;
  orderId: string;
  status: TicketDeliveryStatus;
}

export interface TicketDeliveryRepositoryPort {
  /** spec: communication/ticket-delivery - "Delivery outcome is recorded". */
  record(input: RecordTicketDeliveryInput): Promise<void>;
}

/**
 * Renders a Ticket's code as a QR image (spec: ticketing/ticket -
 * "Ticket code can be rendered as a QR image"; communication/
 * ticket-delivery - "Ticket email includes each Ticket's QR image").
 * Declared here, mirroring EmailProviderPort, so DeliverOrderTicketsUseCase
 * depends only on a port and stays testable with a fake that can simulate a
 * per-code rendering failure.
 */
export interface QrCodeRendererPort {
  render(code: string): Promise<Buffer>;
}
