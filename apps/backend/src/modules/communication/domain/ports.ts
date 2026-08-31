export interface SendEmailInput {
  to: string;
  subject: string;
  body: string;
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
