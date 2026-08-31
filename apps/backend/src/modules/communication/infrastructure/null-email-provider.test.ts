import { describe, expect, it } from "vitest";
import { NullEmailProvider } from "./null-email-provider.js";

describe("NullEmailProvider", () => {
  it("returns not_configured without throwing", async () => {
    const provider = new NullEmailProvider();
    const result = await provider.send({ to: "ana@example.com", subject: "Seus ingressos", body: "..." });
    expect(result).toEqual({ status: "not_configured" });
  });
});
