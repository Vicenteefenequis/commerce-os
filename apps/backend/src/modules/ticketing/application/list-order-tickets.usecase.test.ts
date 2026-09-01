import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { ListOrderTicketsUseCase } from "./list-order-tickets.usecase.js";
import { Entitlement } from "../domain/entitlement.entity.js";
import { Ticket } from "../domain/ticket.entity.js";
import type {
  CreateEntitlementInput,
  CreateTicketInput,
  EntitlementRepositoryPort,
  TicketRepositoryPort,
} from "../domain/ports.js";

class FakeEntitlementRepository implements EntitlementRepositoryPort {
  constructor(private readonly entitlements: Entitlement[] = []) {}
  async create(input: CreateEntitlementInput): Promise<Entitlement> {
    const entitlement = Entitlement.create({ ...input, status: "issued" });
    this.entitlements.push(entitlement);
    return entitlement;
  }
  async findByOrderId(tenantId: string, orderId: string): Promise<Entitlement[]> {
    return this.entitlements.filter((e) => e.tenantId === tenantId && e.orderId === orderId);
  }
  async findById(tenantId: string, id: string): Promise<Entitlement | null> {
    return this.entitlements.find((e) => e.tenantId === tenantId && e.id === id) ?? null;
  }
  async consume(): Promise<boolean> {
    throw new Error("not used by listing");
  }
}

class FakeTicketRepository implements TicketRepositoryPort {
  constructor(private readonly tickets: Ticket[] = []) {}
  async create(input: CreateTicketInput): Promise<Ticket> {
    const ticket = Ticket.create(input);
    this.tickets.push(ticket);
    return ticket;
  }
  async findByEntitlementIds(tenantId: string, entitlementIds: string[]): Promise<Ticket[]> {
    return this.tickets.filter((t) => t.tenantId === tenantId && entitlementIds.includes(t.entitlementId));
  }
  async findByCode(tenantId: string, code: string): Promise<Ticket | null> {
    return this.tickets.find((t) => t.tenantId === tenantId && t.code === code) ?? null;
  }
  async findById(tenantId: string, id: string): Promise<Ticket | null> {
    return this.tickets.find((t) => t.tenantId === tenantId && t.id === id) ?? null;
  }
}

describe("ListOrderTicketsUseCase", () => {
  const tenantId = randomUUID();
  const otherTenantId = randomUUID();
  const orderId = randomUUID();

  function seed(): { entitlements: FakeEntitlementRepository; tickets: FakeTicketRepository } {
    const entitlementA = Entitlement.create({
      id: randomUUID(),
      tenantId,
      orderId,
      orderLineId: randomUUID(),
      customerId: randomUUID(),
      status: "issued",
    });
    const entitlementB = Entitlement.create({
      id: randomUUID(),
      tenantId,
      orderId,
      orderLineId: randomUUID(),
      customerId: randomUUID(),
      status: "issued",
    });
    const otherOrderEntitlement = Entitlement.create({
      id: randomUUID(),
      tenantId,
      orderId: randomUUID(),
      orderLineId: randomUUID(),
      customerId: randomUUID(),
      status: "issued",
    });

    const ticketA = Ticket.create({ id: randomUUID(), tenantId, entitlementId: entitlementA.id, code: "code-a" });
    const ticketB = Ticket.create({ id: randomUUID(), tenantId, entitlementId: entitlementB.id, code: "code-b" });
    const otherTicket = Ticket.create({
      id: randomUUID(),
      tenantId,
      entitlementId: otherOrderEntitlement.id,
      code: "code-other-order",
    });

    return {
      entitlements: new FakeEntitlementRepository([entitlementA, entitlementB, otherOrderEntitlement]),
      tickets: new FakeTicketRepository([ticketA, ticketB, otherTicket]),
    };
  }

  it("returns exactly the Tickets issued for the given Order", async () => {
    const { entitlements, tickets } = seed();
    const useCase = new ListOrderTicketsUseCase(entitlements, tickets);

    const result = await useCase.execute({ tenantId, orderId });

    expect(result.map((t) => t.code).sort()).toEqual(["code-a", "code-b"]);
  });

  it("returns an empty list when a tenant id does not match the Order's owning tenant", async () => {
    const { entitlements, tickets } = seed();
    const useCase = new ListOrderTicketsUseCase(entitlements, tickets);

    const result = await useCase.execute({ tenantId: otherTenantId, orderId });

    expect(result).toEqual([]);
  });

  it("returns an empty list for an Order with no issued Entitlements (not yet paid or nonexistent)", async () => {
    const useCase = new ListOrderTicketsUseCase(new FakeEntitlementRepository(), new FakeTicketRepository());

    const result = await useCase.execute({ tenantId, orderId: randomUUID() });

    expect(result).toEqual([]);
  });
});
