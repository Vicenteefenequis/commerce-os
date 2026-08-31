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
import { CreateOrderUseCase } from "../application/create-order.usecase.js";
import { EmptyCartError, VariantNotFoundError } from "../application/order-errors.js";
import { InvalidOrderError, type Order } from "../domain/order.entity.js";
import { KyselyCustomerRepository } from "../../customer/infrastructure/customer-repository.kysely.js";
import { InvalidCustomerError } from "../../customer/domain/customer.entity.js";
import { KyselyOrderRepository } from "./order-repository.kysely.js";
import { ensureCheckoutSystemUserId } from "./system-user.kysely.js";

/** Capacity holds created at checkout expire after this long if the order never confirms. */
const HOLD_TTL_MS = 15 * 60 * 1000;

function serializeOrder(order: Order) {
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
  };
}

export async function checkoutController(req: Request, trx: Trx): Promise<TxResult> {
  const { venueId, lines, idempotencyKey, customer } = req.body as {
    tenantId?: string;
    venueId?: string;
    lines?: Array<{ variantId?: string; quantity?: number; period?: string }>;
    idempotencyKey?: string;
    customer?: { email?: string; name?: string };
  };

  const identity = req.identity;
  const tenantId = identity?.tenantId ?? ((req.body as { tenantId?: string })?.tenantId ?? "");

  if (!tenantId || !venueId || !lines || lines.length === 0) {
    return { status: 400, body: { error: "tenantId, venueId, and at least one line are required" } };
  }
  if (!customer?.email || !customer?.name) {
    return { status: 400, body: { error: "customer.email and customer.name are required" } };
  }
  const parsedLines = lines.map((l) => ({
    variantId: l.variantId ?? "",
    quantity: l.quantity ?? -1,
    period: l.period,
  }));
  if (parsedLines.some((l) => !l.variantId || !Number.isInteger(l.quantity) || l.quantity <= 0)) {
    return { status: 400, body: { error: "each line requires a variantId and a positive integer quantity" } };
  }

  const actorUserId = identity?.userId ?? (await ensureCheckoutSystemUserId(trx, tenantId));

  const useCase = new CreateOrderUseCase(
    new KyselyProductRepository(trx),
    new KyselyResourceRepository(trx),
    new KyselyCapacityCommitmentRepository(trx),
    new KyselyReservationRepository(trx),
    new KyselyOrderRepository(trx),
    new KyselyCustomerRepository(trx),
    new OutboxEventPublisher(trx),
  );

  try {
    const order = await useCase.execute({
      tenantId,
      venueId,
      customer: { email: customer.email, name: customer.name },
      lines: parsedLines,
      idempotencyKey: idempotencyKey ?? null,
      holdExpiresAt: new Date(Date.now() + HOLD_TTL_MS),
      actorUserId,
    });
    return { status: 201, body: serializeOrder(order) };
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
