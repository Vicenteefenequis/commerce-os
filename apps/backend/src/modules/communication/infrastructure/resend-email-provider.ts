import { Resend } from "resend";
import { env } from "../../../config/env.js";
import type { EmailProviderPort, EmailSendResult, SendEmailInput } from "../domain/ports.js";

/**
 * spec: communication/ticket-delivery - "A configured provider sends the
 * email" / "Provider send failures are recorded, not thrown". design.md:
 * mirrors StripePaymentProvider's shape - throws in the constructor when
 * required config is missing, never throws from send().
 */
export class ResendEmailProvider implements EmailProviderPort {
  private readonly resend: Resend;
  private readonly fromEmail: string;

  constructor(apiKey: string | undefined = env.resendApiKey, fromEmail: string | undefined = env.resendFromEmail) {
    if (!apiKey) throw new Error("Missing required environment variable: RESEND_API_KEY");
    if (!fromEmail) throw new Error("Missing required environment variable: RESEND_FROM_EMAIL");
    this.resend = new Resend(apiKey);
    this.fromEmail = fromEmail;
  }

  async send(input: SendEmailInput): Promise<EmailSendResult> {
    try {
      const { error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: input.to,
        subject: input.subject,
        text: input.body,
        ...(input.html ? { html: input.html } : {}),
        ...(input.attachments?.length
          ? {
              attachments: input.attachments.map((attachment) => ({
                filename: attachment.filename,
                content: attachment.content,
                contentId: attachment.contentId,
                contentType: attachment.contentType,
              })),
            }
          : {}),
      });
      if (error) return { status: "failed", reason: error.message };
      return { status: "sent" };
    } catch (err) {
      return { status: "failed", reason: err instanceof Error ? err.message : String(err) };
    }
  }
}
