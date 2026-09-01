import { beforeEach, describe, expect, it, vi } from "vitest";

const envStub: Record<string, string | undefined> = {
  resendApiKey: undefined,
  resendFromEmail: undefined,
  smtpHost: undefined,
};
vi.mock("../../../config/env.js", () => ({ env: envStub }));

vi.mock("../../communication/infrastructure/resend-email-provider.js", () => ({
  ResendEmailProvider: vi.fn().mockImplementation(() => ({ kind: "resend" })),
}));
vi.mock("../../communication/infrastructure/smtp-email-provider.js", () => ({
  SmtpEmailProvider: vi.fn().mockImplementation(() => ({ kind: "smtp" })),
}));
vi.mock("../../communication/infrastructure/null-email-provider.js", () => ({
  NullEmailProvider: vi.fn().mockImplementation(() => ({ kind: "null" })),
}));

const { selectEmailProvider } = await import("./ticketing-outbox-consumer.js");

describe("selectEmailProvider", () => {
  beforeEach(() => {
    envStub.resendApiKey = undefined;
    envStub.resendFromEmail = undefined;
    envStub.smtpHost = undefined;
  });

  it("falls back to NullEmailProvider when nothing is configured", () => {
    expect(selectEmailProvider()).toEqual({ kind: "null" });
  });

  it("uses SmtpEmailProvider when only SMTP is configured", () => {
    envStub.smtpHost = "localhost";
    expect(selectEmailProvider()).toEqual({ kind: "smtp" });
  });

  it("uses ResendEmailProvider when only Resend is configured", () => {
    envStub.resendApiKey = "re_test";
    envStub.resendFromEmail = "tickets@example.com";
    expect(selectEmailProvider()).toEqual({ kind: "resend" });
  });

  it("prefers ResendEmailProvider over SMTP when both are configured", () => {
    envStub.resendApiKey = "re_test";
    envStub.resendFromEmail = "tickets@example.com";
    envStub.smtpHost = "localhost";
    expect(selectEmailProvider()).toEqual({ kind: "resend" });
  });
});
