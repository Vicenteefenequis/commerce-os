import type { EventPublisherPort } from "../../../shared-kernel/ports.js";
import type { ProductRepositoryPort } from "../../catalog/domain/ports.js";
import { CreateOrderUseCase } from "../../commerce/application/create-order.usecase.js";
import { TransitionOrderStatusUseCase } from "../../commerce/application/transition-order-status.usecase.js";
import type { Order } from "../../commerce/domain/order.entity.js";
import type { OrderRepositoryPort } from "../../commerce/domain/ports.js";
import { ConfirmReservationUseCase } from "../../capacity/application/confirm-reservation.usecase.js";
import type {
  CapacityCommitmentRepositoryPort,
  ReservationRepositoryPort,
  ResourceRepositoryPort,
} from "../../capacity/domain/ports.js";
import { COUNTER_SALE_PLACEHOLDER_CUSTOMER } from "../../customer/application/resolve-placeholder-customer.usecase.js";
import type { CustomerRepositoryPort } from "../../customer/domain/ports.js";
import { CreateCashPaymentUseCase } from "../../payments/application/create-cash-payment.usecase.js";
import type { Payment } from "../../payments/domain/payment.entity.js";
import type { PaymentRepositoryPort } from "../../payments/domain/ports.js";

export interface CreateCounterSaleLineRequest {
  variantId: string;
  quantity: number;
  /** Same meaning as commerce/checkout's line period: which period's capacity this line consumes, when the variant references a Resource. */
  period?: string;
}

export interface CreateCounterSaleCustomerRequest {
  email: string;
  name: string;
}

export interface CreateCounterSaleInput {
  tenantId: string;
  venueId: string;
  /** Optional (spec: admin/counter-sale - "Counter sale buyer identity is optional"); omitted resolves to the Organization's placeholder Customer. */
  customer?: CreateCounterSaleCustomerRequest;
  lines: CreateCounterSaleLineRequest[];
  /** The authenticated staff member's user id (spec: admin/counter-sale - "Counter sale requires an authenticated admin session"). */
  actorUserId: string;
}

export interface CreateCounterSaleResult {
  order: Order;
  payment: Payment;
}

/** Capacity holds created at counter sale expire after this long if the sale never completes (mirrors checkout.controller.ts's HOLD_TTL_MS). */
const HOLD_TTL_MS = 15 * 60 * 1000;

/**
 * spec: admin/counter-sale. Orchestrates the same primitives
 * commerce/checkout uses (price recalculation, capacity/Reservation,
 * Order creation) but completes the Order end to end in one call: draft ->
 * awaiting_payment -> paid, backed by a `cash` Payment created already
 * succeeded, then confirms every Reservation backing the order's lines -
 * the same sequence payments/process-stripe-webhook.usecase.ts runs for a
 * storefront Order, just without a webhook (design.md - Decisions #1, #2).
 * Entitlement/Ticket issuance is unaffected: it is triggered by the
 * `order.status_changed -> paid` event this use case publishes via
 * TransitionOrderStatusUseCase, exactly as it is for a storefront Order.
 */
export class CreateCounterSaleUseCase {
  constructor(
    private readonly products: ProductRepositoryPort,
    private readonly resources: ResourceRepositoryPort,
    private readonly commitments: CapacityCommitmentRepositoryPort,
    private readonly reservations: ReservationRepositoryPort,
    private readonly orders: OrderRepositoryPort,
    private readonly customers: CustomerRepositoryPort,
    private readonly payments: PaymentRepositoryPort,
    private readonly eventPublisher: EventPublisherPort,
  ) {}

  async execute(input: CreateCounterSaleInput): Promise<CreateCounterSaleResult> {
    const createOrder = new CreateOrderUseCase(
      this.products,
      this.resources,
      this.commitments,
      this.reservations,
      this.orders,
      this.customers,
      this.eventPublisher,
    );

    const order = await createOrder.execute({
      tenantId: input.tenantId,
      venueId: input.venueId,
      customer: input.customer ?? COUNTER_SALE_PLACEHOLDER_CUSTOMER,
      lines: input.lines,
      idempotencyKey: null,
      holdExpiresAt: new Date(Date.now() + HOLD_TTL_MS),
      actorUserId: input.actorUserId,
      channel: "counter",
    });

    const transition = new TransitionOrderStatusUseCase(this.orders, this.eventPublisher);
    await transition.execute({
      tenantId: input.tenantId,
      orderId: order.id,
      to: "awaiting_payment",
      actorUserId: input.actorUserId,
    });

    const { payment } = await new CreateCashPaymentUseCase(this.orders, this.payments).execute({
      tenantId: input.tenantId,
      orderId: order.id,
      actorUserId: input.actorUserId,
    });

    await transition.execute({
      tenantId: input.tenantId,
      orderId: order.id,
      to: "paid",
      actorUserId: input.actorUserId,
    });

    const paidOrder = await this.orders.findById(input.tenantId, order.id);

    const confirmReservation = new ConfirmReservationUseCase(this.reservations, this.eventPublisher);
    for (const line of paidOrder?.lines ?? []) {
      if (line.reservationId) {
        await confirmReservation.execute({
          tenantId: input.tenantId,
          reservationId: line.reservationId,
          actorUserId: input.actorUserId,
        });
      }
    }

    return { order: paidOrder ?? order, payment };
  }
}
