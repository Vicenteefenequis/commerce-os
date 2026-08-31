import type { Request } from "express";
import type { Trx, TxResult } from "../../../http/tx-route.js";
import { OutboxEventPublisher } from "../../../events/outbox-publisher.js";
import { CreateReservationUseCase } from "../application/create-reservation.usecase.js";
import { ConfirmReservationUseCase } from "../application/confirm-reservation.usecase.js";
import { ExpireReservationUseCase } from "../application/expire-reservation.usecase.js";
import { CancelReservationUseCase } from "../application/cancel-reservation.usecase.js";
import { ConsumeReservationUseCase } from "../application/consume-reservation.usecase.js";
import { CapacityExceededError, ResourceNotFoundError } from "../application/commit-capacity.usecase.js";
import { InvalidReservationTransitionError, ReservationNotFoundError } from "../application/reservation-errors.js";
import { InvalidResourceError } from "../domain/resource.entity.js";
import { InvalidReservationError, type Reservation } from "../domain/reservation.entity.js";
import { KyselyResourceRepository } from "./resource-repository.kysely.js";
import { KyselyCapacityCommitmentRepository } from "./capacity-commitment-repository.kysely.js";
import { KyselyReservationRepository } from "./reservation-repository.kysely.js";

function serializeReservation(reservation: Reservation) {
  return {
    id: reservation.id,
    resourceId: reservation.resourceId,
    period: reservation.period,
    amount: reservation.amount,
    status: reservation.status,
    commitmentId: reservation.commitmentId,
    expiresAt: reservation.expiresAt.toISOString(),
  };
}

export async function createReservationController(req: Request, trx: Trx): Promise<TxResult> {
  const identity = req.identity;
  if (!identity) return { status: 401, body: { error: "authentication required" } };

  const { resourceId, period, amount, expiresAt } = req.body as {
    resourceId?: string;
    period?: string;
    amount?: number;
    expiresAt?: string;
  };

  const parsedExpiresAt = expiresAt ? new Date(expiresAt) : null;
  if (!resourceId || !period || !parsedExpiresAt || Number.isNaN(parsedExpiresAt.getTime())) {
    return { status: 400, body: { error: "resourceId, period, amount, and a valid expiresAt are required" } };
  }

  const useCase = new CreateReservationUseCase(
    new KyselyResourceRepository(trx),
    new KyselyCapacityCommitmentRepository(trx),
    new KyselyReservationRepository(trx),
    new OutboxEventPublisher(trx),
  );

  try {
    const reservation = await useCase.execute({
      tenantId: identity.tenantId,
      resourceId,
      period,
      amount: amount ?? -1,
      expiresAt: parsedExpiresAt,
      actorUserId: identity.userId,
    });
    return { status: 201, body: serializeReservation(reservation) };
  } catch (err) {
    if (err instanceof InvalidResourceError || err instanceof InvalidReservationError) {
      return { status: 400, body: { error: err.message } };
    }
    if (err instanceof ResourceNotFoundError) return { status: 404, body: { error: err.message } };
    if (err instanceof CapacityExceededError) return { status: 409, body: { error: err.message } };
    throw err;
  }
}

function reservationTransitionErrorResponse(err: unknown): TxResult | null {
  if (err instanceof ReservationNotFoundError) return { status: 404, body: { error: err.message } };
  if (err instanceof InvalidReservationTransitionError) return { status: 409, body: { error: err.message } };
  return null;
}

export async function confirmReservationController(req: Request, trx: Trx): Promise<TxResult> {
  const identity = req.identity;
  if (!identity) return { status: 401, body: { error: "authentication required" } };

  const { id } = req.params as { id: string };
  const useCase = new ConfirmReservationUseCase(new KyselyReservationRepository(trx), new OutboxEventPublisher(trx));

  try {
    await useCase.execute({ tenantId: identity.tenantId, reservationId: id, actorUserId: identity.userId });
    return { status: 204 };
  } catch (err) {
    const mapped = reservationTransitionErrorResponse(err);
    if (mapped) return mapped;
    throw err;
  }
}

export async function expireReservationController(req: Request, trx: Trx): Promise<TxResult> {
  const identity = req.identity;
  if (!identity) return { status: 401, body: { error: "authentication required" } };

  const { id } = req.params as { id: string };
  const useCase = new ExpireReservationUseCase(
    new KyselyReservationRepository(trx),
    new KyselyCapacityCommitmentRepository(trx),
    new OutboxEventPublisher(trx),
  );

  try {
    await useCase.execute({ tenantId: identity.tenantId, reservationId: id, actorUserId: identity.userId });
    return { status: 204 };
  } catch (err) {
    const mapped = reservationTransitionErrorResponse(err);
    if (mapped) return mapped;
    throw err;
  }
}

export async function cancelReservationController(req: Request, trx: Trx): Promise<TxResult> {
  const identity = req.identity;
  if (!identity) return { status: 401, body: { error: "authentication required" } };

  const { id } = req.params as { id: string };
  const useCase = new CancelReservationUseCase(
    new KyselyReservationRepository(trx),
    new KyselyCapacityCommitmentRepository(trx),
    new OutboxEventPublisher(trx),
  );

  try {
    await useCase.execute({ tenantId: identity.tenantId, reservationId: id, actorUserId: identity.userId });
    return { status: 204 };
  } catch (err) {
    const mapped = reservationTransitionErrorResponse(err);
    if (mapped) return mapped;
    throw err;
  }
}

export async function consumeReservationController(req: Request, trx: Trx): Promise<TxResult> {
  const identity = req.identity;
  if (!identity) return { status: 401, body: { error: "authentication required" } };

  const { id } = req.params as { id: string };
  const useCase = new ConsumeReservationUseCase(
    new KyselyReservationRepository(trx),
    new KyselyCapacityCommitmentRepository(trx),
    new OutboxEventPublisher(trx),
  );

  try {
    await useCase.execute({ tenantId: identity.tenantId, reservationId: id, actorUserId: identity.userId });
    return { status: 204 };
  } catch (err) {
    const mapped = reservationTransitionErrorResponse(err);
    if (mapped) return mapped;
    throw err;
  }
}
