import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { ListOrderTicketsUseCase } from "./list-order-tickets.usecase.js";
import { Entitlement } from "../domain/entitlement.entity.js";
import { Ticket } from "../domain/ticket.entity.js";
import type {
  CreateEntitlementInput,
  CreateTicketInput,
  EntitlementRepositoryPort,
  ReservationValidityLookupPort,
  TicketRepositoryPort,
} from "../domain/ports.js";
import { Order, OrderLine } from "../../commerce/domain/order.entity.js";
import type { CreateOrderInput, OrderRepositoryPort } from "../../commerce/domain/ports.js";
import { Organization } from "../../organization/domain/organization.entity.js";
import type { OrganizationRepositoryPort } from "../../organization/domain/ports.js";
import { Product, ProductVariant } from "../../catalog/domain/product.entity.js";
import type { ProductRepositoryPort, VariantLookup } from "../../catalog/domain/ports.js";
import { Customer } from "../../customer/domain/customer.entity.js";
import type { CustomerRepositoryPort } from "../../customer/domain/ports.js";

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

class FakeOrderRepository implements OrderRepositoryPort {
  constructor(private readonly orders: Order[] = []) {}
  async create(_input: CreateOrderInput): Promise<Order> {
    throw new Error("not used by listing");
  }
  async findById(tenantId: string, id: string): Promise<Order | null> {
    return this.orders.find((o) => o.tenantId === tenantId && o.id === id) ?? null;
  }
  async findByIdempotencyKey(): Promise<Order | null> {
    throw new Error("not used by listing");
  }
  async findAllByTenant(): Promise<Order[]> {
    throw new Error("not used by listing");
  }
  async transitionStatus(): Promise<boolean> {
    throw new Error("not used by listing");
  }
  async recordStatusHistory(): Promise<void> {
    throw new Error("not used by listing");
  }
}

class FakeOrganizationRepository implements OrganizationRepositoryPort {
  constructor(private readonly organizations: Organization[] = []) {}
  async create(): Promise<Organization> {
    throw new Error("not used by listing");
  }
  async findById(id: string): Promise<Organization | null> {
    return this.organizations.find((o) => o.id === id) ?? null;
  }
  async findBySlug(): Promise<Organization | null> {
    throw new Error("not used by listing");
  }
  async listAll(): Promise<Organization[]> {
    throw new Error("not used by listing");
  }
}

class FakeProductRepository implements ProductRepositoryPort {
  constructor(
    private readonly products: Product[] = [],
    private readonly variants: VariantLookup[] = [],
  ) {}
  async create(): Promise<Product> {
    throw new Error("not used by listing");
  }
  async findById(tenantId: string, id: string): Promise<Product | null> {
    return this.products.find((p) => p.tenantId === tenantId && p.id === id) ?? null;
  }
  async listByVenue(): Promise<Product[]> {
    throw new Error("not used by listing");
  }
  async update(): Promise<Product> {
    throw new Error("not used by listing");
  }
  async addVariantPriceChange(): Promise<{ variantId: string; previousPriceCents: number; newPriceCents: number }> {
    throw new Error("not used by listing");
  }
  async findVariantById(tenantId: string, variantId: string): Promise<VariantLookup | null> {
    return this.variants.find((v) => v.id === variantId && tenantId) ?? null;
  }
}

class FakeCustomerRepository implements CustomerRepositoryPort {
  constructor(private readonly customers: Customer[] = []) {}
  async create(): Promise<Customer> {
    throw new Error("not used by listing");
  }
  async findByEmail(): Promise<Customer | null> {
    throw new Error("not used by listing");
  }
  async findById(tenantId: string, id: string): Promise<Customer | null> {
    return this.customers.find((c) => c.tenantId === tenantId && c.id === id) ?? null;
  }
  async updateName(): Promise<void> {
    throw new Error("not used by listing");
  }
}

class FakeReservationValidityLookup implements ReservationValidityLookupPort {
  constructor(private readonly periods: Map<string, string> = new Map()) {}
  async findPeriodByReservationId(_tenantId: string, reservationId: string): Promise<string | null> {
    return this.periods.get(reservationId) ?? null;
  }
}

describe("ListOrderTicketsUseCase", () => {
  const tenantId = randomUUID();
  const otherTenantId = randomUUID();
  const orderId = randomUUID();
  const customerId = randomUUID();
  const productId = randomUUID();
  const variantId = randomUUID();
  const reservationId = randomUUID();

  function buildUseCase(deps: {
    entitlements: FakeEntitlementRepository;
    tickets: FakeTicketRepository;
    orders?: FakeOrderRepository;
    organizations?: FakeOrganizationRepository;
    products?: FakeProductRepository;
    customers?: FakeCustomerRepository;
    reservationValidity?: FakeReservationValidityLookup;
  }): ListOrderTicketsUseCase {
    return new ListOrderTicketsUseCase(
      deps.entitlements,
      deps.tickets,
      deps.orders ?? new FakeOrderRepository(),
      deps.organizations ?? new FakeOrganizationRepository(),
      deps.products ?? new FakeProductRepository(),
      deps.customers ?? new FakeCustomerRepository(),
      deps.reservationValidity ?? new FakeReservationValidityLookup(),
    );
  }

  function seed(lineReservationId: string | null = null): {
    entitlements: FakeEntitlementRepository;
    tickets: FakeTicketRepository;
    orders: FakeOrderRepository;
    organizations: FakeOrganizationRepository;
    products: FakeProductRepository;
    customers: FakeCustomerRepository;
    reservationValidity: FakeReservationValidityLookup;
    orderLineAId: string;
    orderLineBId: string;
  } {
    const orderLineAId = randomUUID();
    const orderLineBId = randomUUID();

    const entitlementA = Entitlement.create({
      id: randomUUID(),
      tenantId,
      orderId,
      orderLineId: orderLineAId,
      customerId,
      status: "issued",
    });
    const entitlementB = Entitlement.create({
      id: randomUUID(),
      tenantId,
      orderId,
      orderLineId: orderLineBId,
      customerId,
      status: "issued",
    });
    const otherOrderEntitlement = Entitlement.create({
      id: randomUUID(),
      tenantId,
      orderId: randomUUID(),
      orderLineId: randomUUID(),
      customerId,
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

    const order = Order.create({
      id: orderId,
      tenantId,
      venueId: randomUUID(),
      customerId,
      status: "paid",
      lines: [
        OrderLine.create({
          id: orderLineAId,
          orderId,
          tenantId,
          variantId,
          name: "Lote 1",
          unitPriceCents: 1000,
          quantity: 1,
          reservationId: lineReservationId,
        }),
        OrderLine.create({
          id: orderLineBId,
          orderId,
          tenantId,
          variantId,
          name: "Lote 1",
          unitPriceCents: 1000,
          quantity: 1,
          reservationId: lineReservationId,
        }),
      ],
    });

    const organization = Organization.create({ id: tenantId, name: "Zoo Rio", slug: "zoo-rio" });
    const product = Product.create({
      id: productId,
      tenantId,
      venueId: order.venueId,
      name: "Entrada Geral",
      variants: [
        ProductVariant.create({ id: variantId, productId, tenantId, name: "Lote 1", priceCents: 1000, resourceId: null }),
      ],
    });
    const customer = Customer.create({ id: customerId, tenantId, email: "ana@example.com", name: "Ana" });

    const reservationValidity = new FakeReservationValidityLookup(
      lineReservationId ? new Map([[lineReservationId, "2026-10-01"]]) : undefined,
    );

    return {
      entitlements: new FakeEntitlementRepository([entitlementA, entitlementB, otherOrderEntitlement]),
      tickets: new FakeTicketRepository([ticketA, ticketB, otherTicket]),
      orders: new FakeOrderRepository([order]),
      organizations: new FakeOrganizationRepository([organization]),
      products: new FakeProductRepository(
        [product],
        [{ id: variantId, productId, venueId: order.venueId, name: "Lote 1", priceCents: 1000, resourceId: null }],
      ),
      customers: new FakeCustomerRepository([customer]),
      reservationValidity,
      orderLineAId,
      orderLineBId,
    };
  }

  it("returns exactly the Tickets issued for the given Order, with display context", async () => {
    const deps = seed();
    const useCase = buildUseCase(deps);

    const result = await useCase.execute({ tenantId, orderId });

    expect(result.map((r) => r.ticket.code).sort()).toEqual(["code-a", "code-b"]);
    for (const context of result) {
      expect(context.organizationName).toBe("Zoo Rio");
      expect(context.organizationSlug).toBe("zoo-rio");
      expect(context.offerName).toBe("Entrada Geral");
      expect(context.loteName).toBe("Lote 1");
      expect(context.buyerName).toBe("Ana");
      expect(context.validity).toBeNull();
    }
  });

  it("includes the Reservation's validity window when the Entitlement's Order line is Reservation-backed", async () => {
    const deps = seed(reservationId);
    const useCase = buildUseCase(deps);

    const result = await useCase.execute({ tenantId, orderId });

    for (const context of result) {
      expect(context.validity).not.toBeNull();
      expect(context.validity?.start.getTime()).toBe(new Date(2026, 9, 1, 0, 0, 0, 0).getTime());
      expect(context.validity?.end.getTime()).toBe(new Date(2026, 9, 2, 0, 0, 0, 0).getTime());
    }
  });

  it("returns an empty list when a tenant id does not match the Order's owning tenant", async () => {
    const deps = seed();
    const useCase = buildUseCase(deps);

    const result = await useCase.execute({ tenantId: otherTenantId, orderId });

    expect(result).toEqual([]);
  });

  it("returns an empty list for an Order with no issued Entitlements (not yet paid or nonexistent)", async () => {
    const useCase = buildUseCase({ entitlements: new FakeEntitlementRepository(), tickets: new FakeTicketRepository() });

    const result = await useCase.execute({ tenantId, orderId: randomUUID() });

    expect(result).toEqual([]);
  });
});
