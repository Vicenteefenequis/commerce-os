import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { CreateCounterSaleUseCase } from "./create-counter-sale.usecase.js";
import { COUNTER_SALE_PLACEHOLDER_CUSTOMER } from "../../customer/application/resolve-placeholder-customer.usecase.js";
import { Order, OrderLine } from "../../commerce/domain/order.entity.js";
import type { OrderChannel, OrderStatus } from "../../commerce/domain/order.entity.js";
import type { CreateOrderInput, OrderListFilters, OrderRepositoryPort } from "../../commerce/domain/ports.js";
import { ORDER_STATUS_CHANGED } from "../../commerce/domain/events.js";
import type { ProductRepositoryPort, VariantLookup } from "../../catalog/domain/ports.js";
import { Resource } from "../../capacity/domain/resource.entity.js";
import { Reservation } from "../../capacity/domain/reservation.entity.js";
import type {
  CapacityCommitmentRepositoryPort,
  CreateReservationInput,
  ReservationRepositoryPort,
  ResourceRepositoryPort,
} from "../../capacity/domain/ports.js";
import { Customer } from "../../customer/domain/customer.entity.js";
import type { CreateCustomerInput, CustomerRepositoryPort } from "../../customer/domain/ports.js";
import { Payment } from "../../payments/domain/payment.entity.js";
import type { CreatePaymentInput, PaymentRepositoryPort } from "../../payments/domain/ports.js";
import type { DomainEvent } from "../../../events/domain-event.js";
import type { EventPublisherPort } from "../../../shared-kernel/ports.js";

class FakeProductRepository implements Pick<ProductRepositoryPort, "findVariantById"> {
  constructor(private readonly variants: VariantLookup[]) {}
  async findVariantById(tenantId: string, variantId: string): Promise<VariantLookup | null> {
    return this.variants.find((v) => v.id === variantId) ?? null;
  }
}

class FakeResourceRepository implements ResourceRepositoryPort {
  constructor(private readonly resources: Resource[]) {}
  async create(): Promise<Resource> {
    throw new Error("not used in this test");
  }
  async findById(tenantId: string, id: string): Promise<Resource | null> {
    return this.resources.find((r) => r.tenantId === tenantId && r.id === id) ?? null;
  }
  async listByVenue(): Promise<Resource[]> {
    throw new Error("not used in this test");
  }
  async setDefaultCapacity(): Promise<void> {
    throw new Error("not used in this test");
  }
}

class FakeCommitmentRepository implements CapacityCommitmentRepositoryPort {
  constructor(private readonly acceptsCommit: boolean) {}
  async tryCommit(): Promise<{ id: string } | null> {
    return this.acceptsCommit ? { id: randomUUID() } : null;
  }
  async releaseCommitment(): Promise<boolean> {
    throw new Error("not used in this test");
  }
  async markConsumed(): Promise<boolean> {
    throw new Error("not used in this test");
  }
}

class FakeReservationRepository implements ReservationRepositoryPort {
  public reservations: Reservation[] = [];
  async create(input: CreateReservationInput): Promise<Reservation> {
    const reservation = Reservation.create({ ...input, status: "pending" });
    this.reservations.push(reservation);
    return reservation;
  }
  async findById(tenantId: string, id: string): Promise<Reservation | null> {
    return this.reservations.find((r) => r.tenantId === tenantId && r.id === id) ?? null;
  }
  async transitionStatus(
    tenantId: string,
    id: string,
    from: Reservation["status"] | Reservation["status"][],
    to: Reservation["status"],
  ): Promise<boolean> {
    const fromStatuses = Array.isArray(from) ? from : [from];
    const index = this.reservations.findIndex((r) => r.tenantId === tenantId && r.id === id);
    if (index === -1) return false;
    const current = this.reservations[index]!;
    if (!fromStatuses.includes(current.status)) return false;
    this.reservations[index] = Reservation.create({
      id: current.id,
      tenantId: current.tenantId,
      resourceId: current.resourceId,
      period: current.period,
      amount: current.amount,
      commitmentId: current.commitmentId,
      expiresAt: current.expiresAt,
      status: to,
    });
    return true;
  }
}

class FakeCustomerRepository implements CustomerRepositoryPort {
  public customers: Customer[] = [];
  async create(input: CreateCustomerInput): Promise<Customer> {
    const customer = Customer.create(input);
    this.customers.push(customer);
    return customer;
  }
  async findByEmail(tenantId: string, email: string): Promise<Customer | null> {
    return (
      this.customers.find((c) => c.tenantId === tenantId && c.email.toLowerCase() === email.toLowerCase()) ?? null
    );
  }
  async findById(tenantId: string, id: string): Promise<Customer | null> {
    return this.customers.find((c) => c.tenantId === tenantId && c.id === id) ?? null;
  }
  async updateName(tenantId: string, id: string, name: string): Promise<void> {
    const index = this.customers.findIndex((c) => c.tenantId === tenantId && c.id === id);
    if (index === -1) return;
    const current = this.customers[index]!;
    this.customers[index] = Customer.create({
      id: current.id,
      tenantId: current.tenantId,
      email: current.email,
      name,
    });
  }
}

class FakeOrderRepository implements OrderRepositoryPort {
  public orders: Order[] = [];
  async create(input: CreateOrderInput): Promise<Order> {
    const order = Order.create({
      id: input.id,
      tenantId: input.tenantId,
      venueId: input.venueId,
      customerId: input.customerId,
      status: "draft",
      idempotencyKey: input.idempotencyKey,
      channel: input.channel,
      lines: input.lines.map((l) => OrderLine.create({ ...l, orderId: input.id, tenantId: input.tenantId })),
    });
    this.orders.push(order);
    return order;
  }
  async findById(tenantId: string, id: string): Promise<Order | null> {
    return this.orders.find((o) => o.tenantId === tenantId && o.id === id) ?? null;
  }
  async findByIdempotencyKey(): Promise<Order | null> {
    return null;
  }
  async findAllByTenant(tenantId: string, _filters?: OrderListFilters): Promise<Order[]> {
    return this.orders.filter((o) => o.tenantId === tenantId);
  }
  async transitionStatus(
    tenantId: string,
    id: string,
    from: OrderStatus | OrderStatus[],
    to: OrderStatus,
  ): Promise<boolean> {
    const fromStatuses = Array.isArray(from) ? from : [from];
    const index = this.orders.findIndex((o) => o.tenantId === tenantId && o.id === id);
    if (index === -1) return false;
    const current = this.orders[index]!;
    if (!fromStatuses.includes(current.status)) return false;
    this.orders[index] = Order.create({
      id: current.id,
      tenantId: current.tenantId,
      venueId: current.venueId,
      customerId: current.customerId,
      idempotencyKey: current.idempotencyKey,
      channel: current.channel as OrderChannel,
      status: to,
      lines: current.lines,
    });
    return true;
  }
  async recordStatusHistory(): Promise<void> {}
}

class FakePaymentRepository implements PaymentRepositoryPort {
  public payments: Payment[] = [];
  async create(input: CreatePaymentInput): Promise<Payment> {
    const payment = Payment.create({
      id: input.id,
      tenantId: input.tenantId,
      orderId: input.orderId,
      provider: input.provider,
      providerPaymentId: input.providerPaymentId,
      method: input.method,
      status: input.status ?? "pending",
      amountCents: input.amountCents,
      currency: input.currency,
      refundedAmountCents: 0,
    });
    this.payments.push(payment);
    return payment;
  }
  async findById(): Promise<Payment | null> {
    throw new Error("not used in this test");
  }
  async findActiveByOrderId(tenantId: string, orderId: string): Promise<Payment | null> {
    return (
      this.payments.find(
        (p) => p.tenantId === tenantId && p.orderId === orderId && ["pending", "succeeded"].includes(p.status),
      ) ?? null
    );
  }
  async findMostRecentByOrderId(): Promise<Payment | null> {
    throw new Error("not used in this test");
  }
  async transitionStatus(): Promise<boolean> {
    throw new Error("not used in this test");
  }
  async recordStatusHistory(): Promise<void> {}
}

class FakeEventPublisher implements EventPublisherPort {
  public published: DomainEvent[] = [];
  async publish(events: DomainEvent[]): Promise<void> {
    this.published.push(...events);
  }
}

describe("CreateCounterSaleUseCase", () => {
  const tenantId = randomUUID();
  const venueId = randomUUID();
  const actorUserId = randomUUID();

  const freeVariant: VariantLookup = {
    id: randomUUID(),
    productId: randomUUID(),
    venueId,
    name: "Camiseta",
    priceCents: 3000,
    resourceId: null,
  };

  const resource = Resource.create({
    id: randomUUID(),
    tenantId,
    venueId,
    name: "Portão",
    defaultCapacity: 10,
    hardCapacity: true,
  });

  const bookedVariant: VariantLookup = {
    id: randomUUID(),
    productId: randomUUID(),
    venueId,
    name: "Ingresso",
    priceCents: 5000,
    resourceId: resource.id,
  };

  function buildUseCase(opts: { commitAccepts: boolean }) {
    const products = new FakeProductRepository([freeVariant, bookedVariant]) as unknown as ProductRepositoryPort;
    const reservations = new FakeReservationRepository();
    const orders = new FakeOrderRepository();
    const customers = new FakeCustomerRepository();
    const payments = new FakePaymentRepository();
    const publisher = new FakeEventPublisher();
    const useCase = new CreateCounterSaleUseCase(
      products,
      new FakeResourceRepository([resource]),
      new FakeCommitmentRepository(opts.commitAccepts),
      reservations,
      orders,
      customers,
      payments,
      publisher,
    );
    return { useCase, orders, reservations, customers, payments, publisher };
  }

  it("completes a counter sale as a paid Order backed by a succeeded cash Payment, confirming any held reservation", async () => {
    const { useCase, orders, reservations, payments, publisher } = buildUseCase({ commitAccepts: true });

    const { order, payment } = await useCase.execute({
      tenantId,
      venueId,
      lines: [{ variantId: bookedVariant.id, quantity: 2, period: "2026-06-15" }],
      actorUserId,
    });

    expect(order.status).toBe("paid");
    expect(order.channel).toBe("counter");
    expect(payment.status).toBe("succeeded");
    expect(payment.method).toBe("cash");
    expect(payment.provider).toBe("manual");
    expect(payments.payments).toHaveLength(1);
    expect(orders.orders).toHaveLength(1);
    expect(reservations.reservations[0]?.status).toBe("confirmed");
    expect(publisher.published.some((e) => e.type === ORDER_STATUS_CHANGED && (e.payload as { toStatus?: string }).toStatus === "paid")).toBe(true);
  });

  it("defaults the buyer to the shared placeholder customer when none is provided", async () => {
    const { useCase, orders, customers } = buildUseCase({ commitAccepts: true });

    const { order } = await useCase.execute({
      tenantId,
      venueId,
      lines: [{ variantId: freeVariant.id, quantity: 1 }],
      actorUserId,
    });

    const customer = customers.customers.find((c) => c.id === order.customerId);
    expect(customer?.email.toLowerCase()).toBe(COUNTER_SALE_PLACEHOLDER_CUSTOMER.email.toLowerCase());
    expect(customer?.name).toBe(COUNTER_SALE_PLACEHOLDER_CUSTOMER.name);
    expect(orders.orders).toHaveLength(1);
  });

  it("resolves a real customer when buyer info is provided", async () => {
    const { useCase, customers } = buildUseCase({ commitAccepts: true });

    const { order } = await useCase.execute({
      tenantId,
      venueId,
      customer: { email: "ana@example.com", name: "Ana" },
      lines: [{ variantId: freeVariant.id, quantity: 1 }],
      actorUserId,
    });

    const customer = customers.customers.find((c) => c.id === order.customerId);
    expect(customer?.email).toBe("ana@example.com");
    expect(customer?.name).toBe("Ana");
  });

  it("reuses the same placeholder customer across two counter sales for the same tenant", async () => {
    const { useCase, customers } = buildUseCase({ commitAccepts: true });

    const first = await useCase.execute({
      tenantId,
      venueId,
      lines: [{ variantId: freeVariant.id, quantity: 1 }],
      actorUserId,
    });
    const second = await useCase.execute({
      tenantId,
      venueId,
      lines: [{ variantId: freeVariant.id, quantity: 1 }],
      actorUserId,
    });

    expect(second.order.customerId).toBe(first.order.customerId);
    expect(customers.customers).toHaveLength(1);
  });

  it("rejects and creates no Order, Reservation, or Payment when capacity is unavailable", async () => {
    const { useCase, orders, reservations, payments } = buildUseCase({ commitAccepts: false });

    await expect(
      useCase.execute({
        tenantId,
        venueId,
        lines: [{ variantId: bookedVariant.id, quantity: 3, period: "2026-06-15" }],
        actorUserId,
      }),
    ).rejects.toThrow();

    expect(orders.orders).toHaveLength(0);
    expect(reservations.reservations).toHaveLength(0);
    expect(payments.payments).toHaveLength(0);
  });
});
