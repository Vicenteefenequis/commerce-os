import type { Request } from "express";
import type { Trx, TxResult } from "../../../http/tx-route.js";
import { OutboxEventPublisher } from "../../../events/outbox-publisher.js";
import { KyselyReservationRepository } from "../../capacity/infrastructure/reservation-repository.kysely.js";
import { KyselyCapacityCommitmentRepository } from "../../capacity/infrastructure/capacity-commitment-repository.kysely.js";
import { KyselyPaymentRepository } from "../../payments/infrastructure/payment-repository.kysely.js";
import type { Payment } from "../../payments/domain/payment.entity.js";
import { CancelOrderUseCase } from "../application/cancel-order.usecase.js";
import { FulfillOrderUseCase } from "../application/fulfill-order.usecase.js";
import { TransitionOrderStatusUseCase } from "../application/transition-order-status.usecase.js";
import { InvalidOrderTransitionError, OrderNotFoundError } from "../application/order-errors.js";
import { InvalidReservationTransitionError, ReservationNotFoundError } from "../../capacity/application/reservation-errors.js";
import type { Order, OrderStatus } from "../domain/order.entity.js";
import type { OrderListFilters } from "../domain/ports.js";
import { KyselyOrderRepository } from "./order-repository.kysely.js";
import { ensureCheckoutSystemUserId } from "./system-user.kysely.js";

const ORDER_STATUSES: OrderStatus[] = [
  "draft",
  "awaiting_payment",
  "paid",
  "fulfilled",
  "partially_refunded",
  "refunded",
  "cancelled",
  "expired",
];

function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === "string" && (ORDER_STATUSES as string[]).includes(value);
}

function serializePayment(payment: Payment) {
  return {
    id: payment.id,
    status: payment.status,
    method: payment.method,
    amountCents: payment.amountCents,
    refundedAmountCents: payment.refundedAmountCents,
  };
}

function serializeOrder(order: Order, payment?: Payment | null) {
  return {
    id: order.id,
    venueId: order.venueId,
    status: order.status,
    totalCents: order.totalCents,
    lines: order.lines.map((l) => ({
      id: l.id,
      variantId: l.variantId,
      name: l.name,
      unitPriceCents: l.unitPriceCents,
      quantity: l.quantity,
      reservationId: l.reservationId,
    })),
    ...(payment !== undefined ? { payment: payment ? serializePayment(payment) : null } : {}),
  };
}

/**
 * spec: commerce/order - "Orders can be listed by tenant". List responses
 * omit payment (would require N+1 lookups; see design.md). Supports
 * `id`, `customer`, and `status` query params to locate a specific order
 * (spec addendum in this change: filtering).
 */
export async function listOrdersController(req: Request, trx: Trx): Promise<TxResult> {
  const identity = req.identity;
  if (!identity) return { status: 401, body: { error: "authentication required" } };

  const { id, customer, status } = req.query as { id?: string; customer?: string; status?: string };
  if (status !== undefined && !isOrderStatus(status)) {
    return { status: 400, body: { error: "invalid status filter" } };
  }

  const filters: OrderListFilters = {
    ...(id ? { orderId: id } : {}),
    ...(customer ? { customerQuery: customer } : {}),
    ...(status ? { status } : {}),
  };

  const orders = await new KyselyOrderRepository(trx).findAllByTenant(identity.tenantId, filters);
  return { status: 200, body: { orders: orders.map((o) => serializeOrder(o)) } };
}

export async function getOrderController(req: Request, trx: Trx): Promise<TxResult> {
  const identity = req.identity;
  if (!identity) return { status: 401, body: { error: "authentication required" } };

  const { id } = req.params as { id: string };
  const order = await new KyselyOrderRepository(trx).findById(identity.tenantId, id);
  if (!order) return { status: 404, body: { error: "order not found" } };

  const payment = await new KyselyPaymentRepository(trx).findMostRecentByOrderId(identity.tenantId, id);

  return { status: 200, body: serializeOrder(order, payment) };
}

/**
 * Public, no requireAuth - account-less like checkout.controller.ts
 * (spec: commerce/checkout - "Checkout can be submitted for payment").
 * Gating this to staff would break CHK-001 for the one step that makes
 * an Order payable (design.md - discovered while making the flow
 * manually testable end to end).
 */
export async function submitOrderForPaymentController(req: Request, trx: Trx): Promise<TxResult> {
  const { id } = req.params as { id: string };
  const identity = req.identity;
  const tenantId = identity?.tenantId ?? ((req.body as { tenantId?: string })?.tenantId ?? "");
  if (!tenantId) return { status: 400, body: { error: "tenantId is required" } };

  const actorUserId = identity?.userId ?? (await ensureCheckoutSystemUserId(trx, tenantId));

  try {
    await new TransitionOrderStatusUseCase(new KyselyOrderRepository(trx), new OutboxEventPublisher(trx)).execute({
      tenantId,
      orderId: id,
      to: "awaiting_payment",
      actorUserId,
    });
  } catch (err) {
    if (err instanceof OrderNotFoundError) return { status: 404, body: { error: err.message } };
    if (err instanceof InvalidOrderTransitionError) return { status: 409, body: { error: err.message } };
    throw err;
  }

  const order = await new KyselyOrderRepository(trx).findById(tenantId, id);
  if (!order) return { status: 404, body: { error: "order not found" } };
  return { status: 200, body: serializeOrder(order) };
}

export async function cancelOrderController(req: Request, trx: Trx): Promise<TxResult> {
  const identity = req.identity;
  if (!identity) return { status: 401, body: { error: "authentication required" } };

  const { id } = req.params as { id: string };
  const useCase = new CancelOrderUseCase(
    new KyselyOrderRepository(trx),
    new KyselyReservationRepository(trx),
    new KyselyCapacityCommitmentRepository(trx),
    new OutboxEventPublisher(trx),
  );

  try {
    await useCase.execute({ tenantId: identity.tenantId, orderId: id, actorUserId: identity.userId });
    return { status: 204 };
  } catch (err) {
    if (err instanceof OrderNotFoundError) return { status: 404, body: { error: err.message } };
    if (err instanceof InvalidOrderTransitionError) return { status: 409, body: { error: err.message } };
    throw err;
  }
}

export async function fulfillOrderController(req: Request, trx: Trx): Promise<TxResult> {
  const identity = req.identity;
  if (!identity) return { status: 401, body: { error: "authentication required" } };

  const { id } = req.params as { id: string };
  const useCase = new FulfillOrderUseCase(
    new KyselyOrderRepository(trx),
    new KyselyReservationRepository(trx),
    new KyselyCapacityCommitmentRepository(trx),
    new OutboxEventPublisher(trx),
  );

  try {
    await useCase.execute({ tenantId: identity.tenantId, orderId: id, actorUserId: identity.userId });
  } catch (err) {
    if (err instanceof OrderNotFoundError) return { status: 404, body: { error: err.message } };
    if (err instanceof InvalidOrderTransitionError) return { status: 409, body: { error: err.message } };
    if (err instanceof ReservationNotFoundError) return { status: 409, body: { error: err.message } };
    if (err instanceof InvalidReservationTransitionError) return { status: 409, body: { error: err.message } };
    throw err;
  }

  const order = await new KyselyOrderRepository(trx).findById(identity.tenantId, id);
  if (!order) return { status: 404, body: { error: "order not found" } };
  return { status: 200, body: serializeOrder(order) };
}
