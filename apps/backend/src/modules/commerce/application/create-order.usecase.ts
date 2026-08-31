import { randomUUID } from "node:crypto";
import type { EventPublisherPort } from "../../../shared-kernel/ports.js";
import type { ProductRepositoryPort } from "../../catalog/domain/ports.js";
import { CreateReservationUseCase } from "../../capacity/application/create-reservation.usecase.js";
import type {
  CapacityCommitmentRepositoryPort,
  ReservationRepositoryPort,
  ResourceRepositoryPort,
} from "../../capacity/domain/ports.js";
import { Order, OrderLine } from "../domain/order.entity.js";
import { orderCreatedEvent } from "../domain/events.js";
import type { OrderRepositoryPort } from "../domain/ports.js";
import { EmptyCartError, VariantNotFoundError } from "./order-errors.js";

export interface CreateOrderLineRequest {
  variantId: string;
  quantity: number;
  /**
   * Required only when the variant references a Resource (spec:
   * catalog/product - "Variant capacity linkage"): which period's
   * capacity this line consumes (e.g. a visit date).
   */
  period?: string;
}

export interface CreateOrderInput {
  tenantId: string;
  venueId: string;
  lines: CreateOrderLineRequest[];
  /** De-dupes a retried checkout submission (spec: commerce/checkout - "Checkout prevents accidental duplicate orders"). */
  idempotencyKey?: string | null;
  /** When capacity holds for this order's lines expire if the order is never confirmed. Checkout decides this, not this use case (mirrors CreateReservationUseCase). */
  holdExpiresAt: Date;
  /**
   * The identity a guest checkout's actions are attributed to for audit
   * purposes - resolved by the caller before this use case runs (a real
   * staff identity, or the tenant's reserved system user for a guest
   * checkout - see infrastructure/system-user.kysely.ts). Not "guest" as
   * a concept here: this use case always receives a real users.id.
   */
  actorUserId: string;
}

/**
 * spec: commerce/checkout - "Server recalculates price", "Checkout fails
 * cleanly when capacity is unavailable"; commerce/order - "Order snapshots
 * commercial terms at creation", "Order lines may hold capacity".
 *
 * Every price comes from the current variant row, never from the
 * request. For each line whose variant has a resourceId, a Reservation is
 * created in the same transaction (design.md: "Order -> Reservation: one
 * Reservation per capacity-bound Order line") - if any hold is rejected,
 * nothing here has committed yet, so no Order and no partial Reservation
 * set is created.
 */
export class CreateOrderUseCase {
  constructor(
    private readonly products: ProductRepositoryPort,
    private readonly resources: ResourceRepositoryPort,
    private readonly commitments: CapacityCommitmentRepositoryPort,
    private readonly reservations: ReservationRepositoryPort,
    private readonly orders: OrderRepositoryPort,
    private readonly eventPublisher: EventPublisherPort,
  ) {}

  async execute(input: CreateOrderInput): Promise<Order> {
    if (input.idempotencyKey) {
      const existing = await this.orders.findByIdempotencyKey(input.tenantId, input.idempotencyKey);
      if (existing) return existing;
    }

    if (input.lines.length === 0) {
      throw new EmptyCartError();
    }

    const createReservation = new CreateReservationUseCase(
      this.resources,
      this.commitments,
      this.reservations,
      this.eventPublisher,
    );

    const lineInputs: Array<{
      id: string;
      variantId: string;
      name: string;
      unitPriceCents: number;
      quantity: number;
      reservationId: string | null;
    }> = [];

    for (const requested of input.lines) {
      const variant = await this.products.findVariantById(input.tenantId, requested.variantId);
      if (!variant) throw new VariantNotFoundError();

      let reservationId: string | null = null;
      if (variant.resourceId) {
        const reservation = await createReservation.execute({
          tenantId: input.tenantId,
          resourceId: variant.resourceId,
          period: requested.period ?? "",
          amount: requested.quantity,
          expiresAt: input.holdExpiresAt,
          actorUserId: input.actorUserId,
        });
        reservationId = reservation.id;
      }

      lineInputs.push({
        id: randomUUID(),
        variantId: variant.id,
        name: variant.name,
        unitPriceCents: variant.priceCents,
        quantity: requested.quantity,
        reservationId,
      });
    }

    // Validate shape via the domain entity before persisting (fail fast, same pattern as CreateProductUseCase).
    Order.create({
      id: randomUUID(),
      tenantId: input.tenantId,
      venueId: input.venueId,
      status: "draft",
      idempotencyKey: input.idempotencyKey,
      lines: lineInputs.map((l) =>
        OrderLine.create({
          id: l.id,
          orderId: "",
          tenantId: input.tenantId,
          variantId: l.variantId,
          name: l.name,
          unitPriceCents: l.unitPriceCents,
          quantity: l.quantity,
          reservationId: l.reservationId,
        }),
      ),
    });

    const order = await this.orders.create({
      id: randomUUID(),
      tenantId: input.tenantId,
      venueId: input.venueId,
      idempotencyKey: input.idempotencyKey,
      lines: lineInputs,
    });

    await this.orders.recordStatusHistory(input.tenantId, order.id, null, "draft", input.actorUserId);

    await this.eventPublisher.publish([
      orderCreatedEvent(input.tenantId, {
        orderId: order.id,
        venueId: order.venueId,
        totalCents: order.totalCents,
        actorUserId: input.actorUserId,
      }),
    ]);

    return order;
  }
}
