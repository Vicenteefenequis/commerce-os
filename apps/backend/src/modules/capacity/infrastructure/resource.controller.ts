import type { Request } from "express";
import type { Trx, TxResult } from "../../../http/tx-route.js";
import { OutboxEventPublisher } from "../../../events/outbox-publisher.js";
import { KyselyVenueRepository } from "../../venue/infrastructure/venue-repository.kysely.js";
import {
  CreateResourceUseCase,
  ParentVenueNotFoundError,
} from "../application/create-resource.usecase.js";
import {
  ResourceNotFoundError,
  SetResourceCapacityUseCase,
} from "../application/set-resource-capacity.usecase.js";
import { ListResourcesUseCase } from "../application/list-resources.usecase.js";
import { GetAvailableCapacityUseCase } from "../application/get-available-capacity.usecase.js";
import { InvalidResourceError } from "../domain/resource.entity.js";
import { KyselyResourceRepository } from "./resource-repository.kysely.js";
import {
  KyselyCapacityPeriodRepository,
  ResourceNotFoundError as PeriodResourceNotFoundError,
} from "./capacity-period-repository.kysely.js";

function serializeResource(resource: {
  id: string;
  venueId: string;
  name: string;
  defaultCapacity: number;
  hardCapacity: boolean;
}) {
  return {
    id: resource.id,
    venueId: resource.venueId,
    name: resource.name,
    defaultCapacity: resource.defaultCapacity,
    hardCapacity: resource.hardCapacity,
  };
}

export async function createResourceController(req: Request, trx: Trx): Promise<TxResult> {
  const identity = req.identity;
  if (!identity) return { status: 401, body: { error: "authentication required" } };

  const { venueId, name, defaultCapacity, hardCapacity } = req.body as {
    venueId?: string;
    name?: string;
    defaultCapacity?: number;
    hardCapacity?: boolean;
  };

  const useCase = new CreateResourceUseCase(
    new KyselyVenueRepository(trx),
    new KyselyResourceRepository(trx),
    new OutboxEventPublisher(trx),
  );

  try {
    const resource = await useCase.execute({
      tenantId: identity.tenantId,
      venueId: venueId ?? "",
      name: name ?? "",
      defaultCapacity: defaultCapacity ?? -1,
      hardCapacity,
      actorUserId: identity.userId,
    });
    return { status: 201, body: serializeResource(resource) };
  } catch (err) {
    if (err instanceof InvalidResourceError) return { status: 400, body: { error: err.message } };
    if (err instanceof ParentVenueNotFoundError) return { status: 404, body: { error: err.message } };
    throw err;
  }
}

export async function listResourcesController(req: Request, trx: Trx): Promise<TxResult> {
  const identity = req.identity;
  if (!identity) return { status: 401, body: { error: "authentication required" } };

  const { venueId } = req.query as { venueId?: string };
  if (!venueId) return { status: 400, body: { error: "venueId query parameter is required" } };

  const resources = await new ListResourcesUseCase(new KyselyResourceRepository(trx)).execute(
    identity.tenantId,
    venueId,
  );

  return { status: 200, body: { resources: resources.map(serializeResource) } };
}

export async function setResourceCapacityController(req: Request, trx: Trx): Promise<TxResult> {
  const identity = req.identity;
  if (!identity) return { status: 401, body: { error: "authentication required" } };

  const { id } = req.params as { id: string };
  const { period, capacity } = req.body as { period?: string; capacity?: number };

  const useCase = new SetResourceCapacityUseCase(
    new KyselyResourceRepository(trx),
    new KyselyCapacityPeriodRepository(trx),
    new OutboxEventPublisher(trx),
  );

  try {
    await useCase.execute({
      tenantId: identity.tenantId,
      resourceId: id,
      period,
      capacity: capacity ?? -1,
      actorUserId: identity.userId,
    });
    return { status: 204 };
  } catch (err) {
    if (err instanceof InvalidResourceError) return { status: 400, body: { error: err.message } };
    if (err instanceof ResourceNotFoundError) return { status: 404, body: { error: err.message } };
    throw err;
  }
}

export async function getAvailableCapacityController(req: Request, trx: Trx): Promise<TxResult> {
  const identity = req.identity;
  if (!identity) return { status: 401, body: { error: "authentication required" } };

  const { id } = req.params as { id: string };
  const { period } = req.query as { period?: string };
  if (!period) return { status: 400, body: { error: "period query parameter is required" } };

  try {
    const available = await new GetAvailableCapacityUseCase(
      new KyselyCapacityPeriodRepository(trx),
    ).execute(identity.tenantId, id, period);
    return { status: 200, body: { resourceId: id, period, available } };
  } catch (err) {
    if (err instanceof PeriodResourceNotFoundError) return { status: 404, body: { error: err.message } };
    throw err;
  }
}
