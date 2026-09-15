import type { Request } from "express";
import type { Trx, TxResult } from "../../../http/tx-route.js";
import { OutboxEventPublisher } from "../../../events/outbox-publisher.js";
import { KyselyProductRepository } from "../../catalog/infrastructure/product-repository.kysely.js";
import { KyselyResourceRepository } from "../../capacity/infrastructure/resource-repository.kysely.js";
import { KyselyCapacityCommitmentRepository } from "../../capacity/infrastructure/capacity-commitment-repository.kysely.js";
import { KyselyReservationRepository } from "../../capacity/infrastructure/reservation-repository.kysely.js";
import { CapacityExceededError, ResourceNotFoundError } from "../../capacity/application/commit-capacity.usecase.js";
import { InvalidResourceError } from "../../capacity/domain/resource.entity.js";
import { InvalidReservationError } from "../../capacity/domain/reservation.entity.js";
import { KyselyCustomerRepository } from "../../customer/infrastructure/customer-repository.kysely.js";
import { InvalidCustomerError } from "../../customer/domain/customer.entity.js";
import { KyselyOrderRepository } from "../../commerce/infrastructure/order-repository.kysely.js";
import { EmptyCartError, VariantNotFoundError } from "../../commerce/application/order-errors.js";
import { InvalidOrderError, type Order } from "../../commerce/domain/order.entity.js";
import { KyselyPaymentRepository } from "../../payments/infrastructure/payment-repository.kysely.js";
import type { Payment } from "../../payments/domain/payment.entity.js";
import { CreateCounterSaleUseCase } from "../application/create-counter-sale.usecase.js";

function serializeOrder(order: Order) {
  return {
    id: order.id,
    venueId: order.venueId,
    status: order.status,
    channel: order.channel,
    totalCents: order.totalCents,
    lines: order.lines.map((l) => ({
      id: l.id,
      variantId: l.variantId,
      name: l.name,
      unitPriceCents: l.unitPriceCents,
      quantity: l.quantity,
      reservationId: l.reservationId,
    })),
  };
}

function serializePayment(payment: Payment) {
  return {
    id: payment.id,
    status: payment.status,
    method: payment.method,
    amountCents: payment.amountCents,
  };
}

/**
 * spec: admin/counter-sale. Requires only an authenticated admin session
 * (requireAuth in counter-sale.routes.ts) - no additional permission, per
 * "Counter sale requires an authenticated admin session".
 */
export async function createCounterSaleController(req: Request, trx: Trx): Promise<TxResult> {
  const identity = req.identity;
  if (!identity) return { status: 401, body: { error: "authentication required" } };

  const { venueId, lines, customer } = req.body as {
    venueId?: string;
    lines?: Array<{ variantId?: string; quantity?: number; period?: string }>;
    customer?: { email?: string; name?: string };
  };

  if (!venueId || !lines || lines.length === 0) {
    return { status: 400, body: { error: "venueId and at least one line are required" } };
  }
  const parsedLines = lines.map((l) => ({
    variantId: l.variantId ?? "",
    quantity: l.quantity ?? -1,
    period: l.period,
  }));
  if (parsedLines.some((l) => !l.variantId || !Number.isInteger(l.quantity) || l.quantity <= 0)) {
    return { status: 400, body: { error: "each line requires a variantId and a positive integer quantity" } };
  }
  if (customer && (!customer.email || !customer.name)) {
    return { status: 400, body: { error: "customer, when provided, requires both email and name" } };
  }

  const useCase = new CreateCounterSaleUseCase(
    new KyselyProductRepository(trx),
    new KyselyResourceRepository(trx),
    new KyselyCapacityCommitmentRepository(trx),
    new KyselyReservationRepository(trx),
    new KyselyOrderRepository(trx),
    new KyselyCustomerRepository(trx),
    new KyselyPaymentRepository(trx),
    new OutboxEventPublisher(trx),
  );

  try {
    const { order, payment } = await useCase.execute({
      tenantId: identity.tenantId,
      venueId,
      customer: customer?.email && customer?.name ? { email: customer.email, name: customer.name } : undefined,
      lines: parsedLines,
      actorUserId: identity.userId,
    });
    return { status: 201, body: { order: serializeOrder(order), payment: serializePayment(payment) } };
  } catch (err) {
    if (
      err instanceof InvalidOrderError ||
      err instanceof InvalidResourceError ||
      err instanceof InvalidReservationError ||
      err instanceof InvalidCustomerError ||
      err instanceof EmptyCartError
    ) {
      return { status: 400, body: { error: err.message } };
    }
    if (err instanceof VariantNotFoundError || err instanceof ResourceNotFoundError) {
      return { status: 404, body: { error: err.message } };
    }
    if (err instanceof CapacityExceededError) {
      return { status: 409, body: { error: err.message } };
    }
    throw err;
  }
}
