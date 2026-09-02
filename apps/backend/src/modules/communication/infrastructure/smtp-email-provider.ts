import nodemailer, { type Transporter } from "nodemailer";
import { env } from "../../../config/env.js";
import type { EmailProviderPort, EmailSendResult, SendEmailInput } from "../domain/ports.js";

/**
 * Dev-only implementation of EmailProviderPort (design.md - "exists only
 * to unblock local development without spending Resend send quota").
 * Targets a local SMTP catcher (Mailpit by default) or a Mailtrap Email
 * Testing sandbox - never used in staging/prod, where ResendEmailProvider
 * always takes priority when configured.
 */
export class SmtpEmailProvider implements EmailProviderPort {
  private readonly transporter: Transporter;
  private readonly fromEmail: string;

  constructor(
    host: string | undefined = env.smtpHost,
    port: number = env.smtpPort,
    user: string | undefined = env.smtpUser,
    pass: string | undefined = env.smtpPass,
    fromEmail: string = env.resendFromEmail ?? "tickets@localhost",
  ) {
    if (!host) throw new Error("Missing required environment variable: SMTP_HOST");
    this.fromEmail = fromEmail;
    this.transporter = nodemailer.createTransport({
      host,
      port,
      auth: user && pass ? { user, pass } : undefined,
    });
  }

  async send(input: SendEmailInput): Promise<EmailSendResult> {
    try {
      await this.transporter.sendMail({
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
                cid: attachment.contentId,
                contentType: attachment.contentType,
              })),
            }
          : {}),
      });
      return { status: "sent" };
    } catch (err) {
      return { status: "failed", reason: err instanceof Error ? err.message : String(err) };
    }
  }
}
