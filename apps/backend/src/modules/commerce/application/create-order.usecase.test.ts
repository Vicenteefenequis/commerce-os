import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { CreateOrderUseCase } from "./create-order.usecase.js";
import { Order, OrderLine } from "../domain/order.entity.js";
import type { CreateOrderInput, OrderRepositoryPort } from "../domain/ports.js";
import type { ProductRepositoryPort, VariantLookup } from "../../catalog/domain/ports.js";
import { Resource } from "../../capacity/domain/resource.entity.js";
import type {
  CapacityCommitmentRepositoryPort,
  ReservationRepositoryPort,
  ResourceRepositoryPort,
} from "../../capacity/domain/ports.js";
import { Reservation } from "../../capacity/domain/reservation.entity.js";
import type { DomainEvent } from "../../../events/domain-event.js";
import type { EventPublisherPort } from "../../../shared-kernel/ports.js";
import { ORDER_CREATED } from "../domain/events.js";
import { VariantNotFoundError, EmptyCartError } from "./order-errors.js";
import { Customer } from "../../customer/domain/customer.entity.js";
import type { CreateCustomerInput, CustomerRepositoryPort } from "../../customer/domain/ports.js";

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
  async updateName(): Promise<void> {}
}

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
  public committed: Array<{ resourceId: string; period: string; amount: number }> = [];
  async tryCommit(input: {
    tenantId: string;
    resourceId: string;
    period: string;
    amount: number;
    hardCapacity: boolean;
  }): Promise<{ id: string } | null> {
    if (!this.acceptsCommit) return null;
    this.committed.push({ resourceId: input.resourceId, period: input.period, amount: input.amount });
    return { id: randomUUID() };
  }
  async releaseCommitment(): Promise<boolean> {
    throw new Error("not used in this test");
  }
  async markConsumed(): Promise<boolean> {
    throw new Error("not used in this test");
  }
}

class FakeReservationRepository implements ReservationRepositoryPort {
  public created: Reservation[] = [];
  async create(input: {
    id: string;
    tenantId: string;
    resourceId: string;
    period: string;
    amount: number;
    commitmentId: string;
    expiresAt: Date;
  }): Promise<Reservation> {
    const reservation = Reservation.create({ ...input, status: "pending" });
    this.created.push(reservation);
    return reservation;
  }
  async findById(): Promise<Reservation | null> {
    throw new Error("not used in this test");
  }
  async transitionStatus(): Promise<boolean> {
    throw new Error("not used in this test");
  }
}

class FakeOrderRepository implements OrderRepositoryPort {
  public created: Order[] = [];
  public historyEntries: Array<{ orderId: string; from: string | null; to: string; actorUserId: string | null }> = [];
  async create(input: CreateOrderInput): Promise<Order> {
    const order = Order.create({
      id: input.id,
      tenantId: input.tenantId,
      venueId: input.venueId,
      customerId: input.customerId,
      status: "draft",
      idempotencyKey: input.idempotencyKey,
      lines: input.lines.map((l) => OrderLine.create({ ...l, orderId: input.id, tenantId: input.tenantId })),
    });
    this.created.push(order);
    return order;
  }
  async findById(tenantId: string, id: string): Promise<Order | null> {
    return this.created.find((o) => o.tenantId === tenantId && o.id === id) ?? null;
  }
  async findByIdempotencyKey(tenantId: string, idempotencyKey: string): Promise<Order | null> {
    return this.created.find((o) => o.tenantId === tenantId && o.idempotencyKey === idempotencyKey) ?? null;
  }
  async findAllByTenant(): Promise<Order[]> {
    throw new Error("not used in this test");
  }
  async transitionStatus(): Promise<boolean> {
    throw new Error("not used in this test");
  }
  async recordStatusHistory(
    tenantId: string,
    orderId: string,
    fromStatus: string | null,
    toStatus: string,
    actorUserId: string | null,
  ): Promise<void> {
    this.historyEntries.push({ orderId, from: fromStatus, to: toStatus, actorUserId });
  }
}

class FakeEventPublisher implements EventPublisherPort {
  public published: DomainEvent[] = [];
  async publish(events: DomainEvent[]): Promise<void> {
    this.published.push(...events);
  }
}

describe("CreateOrderUseCase", () => {
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

  const customer = { email: "ana@example.com", name: "Ana" };

  function buildUseCase(opts: { commitAccepts: boolean }) {
    const products = new FakeProductRepository([freeVariant, bookedVariant]) as unknown as ProductRepositoryPort;
    const commitments = new FakeCommitmentRepository(opts.commitAccepts);
    const reservations = new FakeReservationRepository();
    const orders = new FakeOrderRepository();
    const customers = new FakeCustomerRepository();
    const publisher = new FakeEventPublisher();
    const useCase = new CreateOrderUseCase(
      products,
      new FakeResourceRepository([resource]),
      commitments,
      reservations,
      orders,
      customers,
      publisher,
    );
    return { useCase, orders, reservations, customers, publisher };
  }

  it("recalculates price server-side and holds capacity for lines with a resourceId", async () => {
    const { useCase, orders, reservations, publisher } = buildUseCase({ commitAccepts: true });

    const order = await useCase.execute({
      tenantId,
      venueId,
      customer,
      lines: [
        { variantId: freeVariant.id, quantity: 2 },
        { variantId: bookedVariant.id, quantity: 3, period: "2026-06-15" },
      ],
      holdExpiresAt: new Date(Date.now() + 900_000),
      actorUserId,
    });

    expect(order.status).toBe("draft");
    expect(order.lines).toHaveLength(2);
    expect(order.lines.find((l) => l.variantId === freeVariant.id)?.reservationId).toBeNull();
    expect(order.lines.find((l) => l.variantId === bookedVariant.id)?.reservationId).toBe(
      reservations.created[0]?.id,
    );
    expect(order.totalCents).toBe(2 * 3000 + 3 * 5000);
    expect(orders.created).toHaveLength(1);
    expect(publisher.published.some((e) => e.type === ORDER_CREATED)).toBe(true);
  });

  it("rejects checkout and creates no order when capacity is unavailable", async () => {
    const { useCase, orders } = buildUseCase({ commitAccepts: false });

    await expect(
      useCase.execute({
        tenantId,
        venueId,
        customer,
        lines: [{ variantId: bookedVariant.id, quantity: 3, period: "2026-06-15" }],
        holdExpiresAt: new Date(Date.now() + 900_000),
        actorUserId,
      }),
    ).rejects.toThrow();
    expect(orders.created).toHaveLength(0);
  });

  it("rejects a checkout with no lines", async () => {
    const { useCase } = buildUseCase({ commitAccepts: true });
    await expect(
      useCase.execute({ tenantId, venueId, customer, lines: [], holdExpiresAt: new Date(), actorUserId }),
    ).rejects.toBeInstanceOf(EmptyCartError);
  });

  it("rejects a line referencing a variant that does not exist", async () => {
    const { useCase } = buildUseCase({ commitAccepts: true });
    await expect(
      useCase.execute({
        tenantId,
        venueId,
        customer,
        lines: [{ variantId: randomUUID(), quantity: 1 }],
        holdExpiresAt: new Date(Date.now() + 900_000),
        actorUserId,
      }),
    ).rejects.toBeInstanceOf(VariantNotFoundError);
  });

  it("returns the existing order for a retried idempotency key instead of creating a second one", async () => {
    const { useCase, orders } = buildUseCase({ commitAccepts: true });
    const idempotencyKey = randomUUID();

    const first = await useCase.execute({
      tenantId,
      venueId,
      customer,
      lines: [{ variantId: freeVariant.id, quantity: 1 }],
      holdExpiresAt: new Date(Date.now() + 900_000),
      actorUserId,
      idempotencyKey,
    });
    const second = await useCase.execute({
      tenantId,
      venueId,
      customer,
      lines: [{ variantId: freeVariant.id, quantity: 1 }],
      holdExpiresAt: new Date(Date.now() + 900_000),
      actorUserId,
      idempotencyKey,
    });

    expect(second.id).toBe(first.id);
    expect(orders.created).toHaveLength(1);
  });
});
