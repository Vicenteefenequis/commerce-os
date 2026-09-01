import { describe, expect, it, vi } from "vitest";

const sendMock = vi.fn();
vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(() => ({ emails: { send: sendMock } })),
}));

const { ResendEmailProvider } = await import("./resend-email-provider.js");

describe("ResendEmailProvider", () => {
  const input = { to: "ana@example.com", subject: "Seus ingressos", body: "..." };

  it("throws when apiKey is missing", () => {
    expect(() => new ResendEmailProvider(undefined, "tickets@example.com")).toThrow(/RESEND_API_KEY/);
  });

  it("throws when fromEmail is missing", () => {
    expect(() => new ResendEmailProvider("re_test", undefined)).toThrow(/RESEND_FROM_EMAIL/);
  });

  it("returns sent on a successful response", async () => {
    sendMock.mockResolvedValueOnce({ data: { id: "email_1" }, error: null });
    const provider = new ResendEmailProvider("re_test", "tickets@example.com");

    const result = await provider.send(input);

    expect(result).toEqual({ status: "sent" });
    expect(sendMock).toHaveBeenCalledWith({
      from: "tickets@example.com",
      to: input.to,
      subject: input.subject,
      text: input.body,
    });
  });

  it("returns failed, not throwing, when the SDK returns an error field", async () => {
    sendMock.mockResolvedValueOnce({ data: null, error: { message: "invalid_from_address", statusCode: 422, name: "invalid_from_address" } });
    const provider = new ResendEmailProvider("re_test", "tickets@example.com");

    const result = await provider.send(input);

    expect(result).toEqual({ status: "failed", reason: "invalid_from_address" });
  });

  it("returns failed, not throwing, when the SDK call throws", async () => {
    sendMock.mockRejectedValueOnce(new Error("network down"));
    const provider = new ResendEmailProvider("re_test", "tickets@example.com");

    const result = await provider.send(input);

    expect(result).toEqual({ status: "failed", reason: "network down" });
  });
});
