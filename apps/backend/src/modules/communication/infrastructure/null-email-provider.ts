import type { EmailProviderPort, EmailSendResult, SendEmailInput } from "../domain/ports.js";

/**
 * The wired default until a real provider is chosen and configured
 * (proposal.md - "No concrete provider is wired in this change"; PRD
 * marker for M4's email leg, same posture as Pix pre-activation). Never
 * throws.
 */
export class NullEmailProvider implements EmailProviderPort {
  async send(_input: SendEmailInput): Promise<EmailSendResult> {
    return { status: "not_configured" };
  }
}
