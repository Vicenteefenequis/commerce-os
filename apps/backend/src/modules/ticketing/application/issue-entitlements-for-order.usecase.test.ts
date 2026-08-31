import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { IssueEntitlementsForOrderUseCase } from "./issue-entitlements-for-order.usecase.js";
import { Order, OrderLine } from "../../commerce/domain/order.entity.js";
import type { OrderRepositoryPort } from "../../commerce/domain/ports.js";
import { OrderNotFoundError } from "../../commerce/application/order-errors.js";
import { Entitlement } from "../domain/entitlement.entity.js";
import { Ticket } from "../domain/ticket.entity.js";
import type {
  CreateEntitlementInput,
  CreateTicketInput,
  EntitlementRepositoryPort,
  TicketRepositoryPort,
} from "../domain/ports.js";

class FakeOrderRepository implements Pick<OrderRepositoryPort, "findById"> {
  constructor(private readonly order: Order | null) {}
  async findById(tenantId: string, id: string): Promise<Order | null> {
    return this.order && this.order.tenantId === tenantId && this.order.id === id ? this.order : null;
  }
}

class FakeEntitlementRepository implements EntitlementRepositoryPort {
  public created: Entitlement[] = [];
  async create(input: CreateEntitlementInput): Promise<Entitlement> {
    const entitlement = Entitlement.create({ ...input, status: "issued" });
    this.created.push(entitlement);
    return entitlement;
  }
  async findByOrderId(tenantId: string, orderId: string): Promise<Entitlement[]> {
    return this.created.filter((e) => e.tenantId === tenantId && e.orderId === orderId);
  }
}

class FakeTicketRepository implements TicketRepositoryPort {
  public created: Ticket[] = [];
  async create(input: CreateTicketInput): Promise<Ticket> {
    const ticket = Ticket.create(input);
    this.created.push(ticket);
    return ticket;
  }
  async findByEntitlementIds(tenantId: string, entitlementIds: string[]): Promise<Ticket[]> {
    return this.created.filter((t) => t.tenantId === tenantId && entitlementIds.includes(t.entitlementId));
  }
}

describe("IssueEntitlementsForOrderUseCase", () => {
  const tenantId = randomUUID();
  const customerId = randomUUID();

  function buildOrder(quantities: number[]): Order {
    const orderId = randomUUID();
    return Order.create({
      id: orderId,
      tenantId,
      venueId: randomUUID(),
      customerId,
      status: "paid",
      lines: quantities.map((quantity) =>
        OrderLine.create({
          id: randomUUID(),
          orderId,
          tenantId,
          variantId: randomUUID(),
          name: "Ingresso",
          unitPriceCents: 1000,
          quantity,
        }),
      ),
    });
  }

  it("issues one Entitlement and one Ticket per unit of quantity across all lines", async () => {
    const order = buildOrder([3, 2]);
    const orders = new FakeOrderRepository(order) as unknown as OrderRepositoryPort;
    const entitlements = new FakeEntitlementRepository();
    const tickets = new FakeTicketRepository();
    const useCase = new IssueEntitlementsForOrderUseCase(orders, entitlements, tickets);

    const result = await useCase.execute({ tenantId, orderId: order.id });

    expect(result.issued).toBe(true);
    expect(result.entitlements).toHaveLength(5);
    expect(result.tickets).toHaveLength(5);
    expect(new Set(result.tickets.map((t) => t.code)).size).toBe(5);
    expect(result.entitlements.every((e) => e.customerId === customerId)).toBe(true);
  });

  it("does not issue Entitlements a second time for the same Order (idempotent)", async () => {
    const order = buildOrder([2]);
    const orders = new FakeOrderRepository(order) as unknown as OrderRepositoryPort;
    const entitlements = new FakeEntitlementRepository();
    const tickets = new FakeTicketRepository();
    const useCase = new IssueEntitlementsForOrderUseCase(orders, entitlements, tickets);

    const first = await useCase.execute({ tenantId, orderId: order.id });
    const second = await useCase.execute({ tenantId, orderId: order.id });

    expect(first.issued).toBe(true);
    expect(second.issued).toBe(false);
    expect(entitlements.created).toHaveLength(2);
    expect(tickets.created).toHaveLength(2);
    expect(second.entitlements.map((e) => e.id).sort()).toEqual(first.entitlements.map((e) => e.id).sort());
  });

  it("throws when the Order does not exist", async () => {
    const orders = new FakeOrderRepository(null) as unknown as OrderRepositoryPort;
    const useCase = new IssueEntitlementsForOrderUseCase(orders, new FakeEntitlementRepository(), new FakeTicketRepository());

    await expect(useCase.execute({ tenantId, orderId: randomUUID() })).rejects.toBeInstanceOf(OrderNotFoundError);
  });
});
