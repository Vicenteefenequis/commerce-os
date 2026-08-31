import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { DeliverOrderTicketsUseCase } from "./deliver-order-tickets.usecase.js";
import type { EmailProviderPort, EmailSendResult, RecordTicketDeliveryInput, SendEmailInput, TicketDeliveryRepositoryPort } from "../domain/ports.js";

class FakeEmailProvider implements EmailProviderPort {
  constructor(
    private readonly result: EmailSendResult | Error = { status: "sent" },
  ) {}
  public sent: SendEmailInput[] = [];
  async send(input: SendEmailInput): Promise<EmailSendResult> {
    this.sent.push(input);
    if (this.result instanceof Error) throw this.result;
    return this.result;
  }
}

class FakeTicketDeliveryRepository implements TicketDeliveryRepositoryPort {
  public records: RecordTicketDeliveryInput[] = [];
  async record(input: RecordTicketDeliveryInput): Promise<void> {
    this.records.push(input);
  }
}

describe("DeliverOrderTicketsUseCase", () => {
  const tenantId = randomUUID();
  const orderId = randomUUID();
  const baseInput = {
    tenantId,
    orderId,
    customerEmail: "ana@example.com",
    customerName: "Ana",
    ticketCodes: ["abc123", "def456"],
  };

  it("records a successful delivery when the provider sends", async () => {
    const provider = new FakeEmailProvider({ status: "sent" });
    const deliveries = new FakeTicketDeliveryRepository();
    const useCase = new DeliverOrderTicketsUseCase(provider, deliveries);

    const status = await useCase.execute(baseInput);

    expect(status).toBe("sent");
    expect(deliveries.records).toEqual([{ id: expect.any(String), tenantId, orderId, status: "sent" }]);
    expect(provider.sent[0]?.to).toBe("ana@example.com");
  });

  it("records not_configured without throwing when no provider is configured", async () => {
    const provider = new FakeEmailProvider({ status: "not_configured" });
    const deliveries = new FakeTicketDeliveryRepository();
    const useCase = new DeliverOrderTicketsUseCase(provider, deliveries);

    const status = await useCase.execute(baseInput);

    expect(status).toBe("not_configured");
    expect(deliveries.records[0]?.status).toBe("not_configured");
  });

  it("records failed and does not throw when the provider errors", async () => {
    const provider = new FakeEmailProvider(new Error("network down"));
    const deliveries = new FakeTicketDeliveryRepository();
    const useCase = new DeliverOrderTicketsUseCase(provider, deliveries);

    const status = await useCase.execute(baseInput);

    expect(status).toBe("failed");
    expect(deliveries.records[0]?.status).toBe("failed");
  });
});
