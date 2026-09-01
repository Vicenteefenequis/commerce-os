import { describe, expect, it, vi } from "vitest";

const sendMailMock = vi.fn();
vi.mock("nodemailer", () => ({
  default: { createTransport: vi.fn().mockReturnValue({ sendMail: sendMailMock }) },
}));

const { SmtpEmailProvider } = await import("./smtp-email-provider.js");

describe("SmtpEmailProvider", () => {
  const input = { to: "ana@example.com", subject: "Seus ingressos", body: "..." };

  it("throws when host is missing", () => {
    expect(() => new SmtpEmailProvider(undefined, 1025)).toThrow(/SMTP_HOST/);
  });

  it("returns sent on a successful send", async () => {
    sendMailMock.mockResolvedValueOnce({ messageId: "abc" });
    const provider = new SmtpEmailProvider("localhost", 1025);

    const result = await provider.send(input);

    expect(result).toEqual({ status: "sent" });
    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: input.to, subject: input.subject, text: input.body }),
    );
  });

  it("returns failed, not throwing, when sendMail rejects", async () => {
    sendMailMock.mockRejectedValueOnce(new Error("connection refused"));
    const provider = new SmtpEmailProvider("localhost", 1025);

    const result = await provider.send(input);

    expect(result).toEqual({ status: "failed", reason: "connection refused" });
  });
});
