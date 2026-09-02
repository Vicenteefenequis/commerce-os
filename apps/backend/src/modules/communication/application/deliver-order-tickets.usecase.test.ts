import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { DeliverOrderTicketsUseCase } from "./deliver-order-tickets.usecase.js";
import type {
  EmailProviderPort,
  EmailSendResult,
  QrCodeRendererPort,
  RecordTicketDeliveryInput,
  SendEmailInput,
  TicketDeliveryRepositoryPort,
} from "../domain/ports.js";

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

class FakeQrCodeRenderer implements QrCodeRendererPort {
  constructor(private readonly failFor: ReadonlySet<string> = new Set()) {}
  async render(code: string): Promise<Buffer> {
    if (this.failFor.has(code)) throw new Error("qr render failed");
    return Buffer.from(`qr:${code}`);
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
    const useCase = new DeliverOrderTicketsUseCase(provider, deliveries, new FakeQrCodeRenderer());

    const status = await useCase.execute(baseInput);

    expect(status).toBe("sent");
    expect(deliveries.records).toEqual([{ id: expect.any(String), tenantId, orderId, status: "sent" }]);
    expect(provider.sent[0]?.to).toBe("ana@example.com");
  });

  it("records not_configured without throwing when no provider is configured", async () => {
    const provider = new FakeEmailProvider({ status: "not_configured" });
    const deliveries = new FakeTicketDeliveryRepository();
    const useCase = new DeliverOrderTicketsUseCase(provider, deliveries, new FakeQrCodeRenderer());

    const status = await useCase.execute(baseInput);

    expect(status).toBe("not_configured");
    expect(deliveries.records[0]?.status).toBe("not_configured");
  });

  it("records failed and does not throw when the provider errors", async () => {
    const provider = new FakeEmailProvider(new Error("network down"));
    const deliveries = new FakeTicketDeliveryRepository();
    const useCase = new DeliverOrderTicketsUseCase(provider, deliveries, new FakeQrCodeRenderer());

    const status = await useCase.execute(baseInput);

    expect(status).toBe("failed");
    expect(deliveries.records[0]?.status).toBe("failed");
  });

  it("includes one QR image per ticket code in the email html, embedded as a cid: inline attachment (spec: Ticket email includes each Ticket's QR image)", async () => {
    const provider = new FakeEmailProvider({ status: "sent" });
    const deliveries = new FakeTicketDeliveryRepository();
    const useCase = new DeliverOrderTicketsUseCase(provider, deliveries, new FakeQrCodeRenderer());

    await useCase.execute(baseInput);

    const sent = provider.sent[0];
    const html = sent?.html ?? "";
    expect(html.match(/<img/g)).toHaveLength(2);
    expect(html).not.toContain("data:image");
    expect(sent?.attachments).toHaveLength(2);
    for (const attachment of sent?.attachments ?? []) {
      expect(html).toContain(`src="cid:${attachment.contentId}"`);
    }
    for (const code of baseInput.ticketCodes) {
      expect(sent?.attachments?.some((a) => a.content.equals(Buffer.from(`qr:${code}`)))).toBe(true);
    }
  });

  it("falls back to text for a ticket whose QR fails to render, without failing the whole delivery (spec: QR generation failure does not block delivery of the code)", async () => {
    const provider = new FakeEmailProvider({ status: "sent" });
    const deliveries = new FakeTicketDeliveryRepository();
    const qrRenderer = new FakeQrCodeRenderer(new Set(["def456"]));
    const useCase = new DeliverOrderTicketsUseCase(provider, deliveries, qrRenderer);

    const status = await useCase.execute(baseInput);

    expect(status).toBe("sent");
    expect(deliveries.records[0]?.status).toBe("sent");
    const sent = provider.sent[0];
    const html = sent?.html ?? "";
    expect(html.match(/<img/g)).toHaveLength(1);
    expect(sent?.attachments).toHaveLength(1);
    expect(sent?.attachments?.[0]?.content.equals(Buffer.from("qr:abc123"))).toBe(true);
    expect(html).toContain("def456");
  });
});
