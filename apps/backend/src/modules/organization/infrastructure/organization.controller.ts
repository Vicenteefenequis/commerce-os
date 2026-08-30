import type { Request } from "express";
import type { Trx, TxResult } from "../../../http/tx-route.js";
import { OutboxEventPublisher } from "../../../events/outbox-publisher.js";
import { CreateOrganizationUseCase } from "../application/create-organization.usecase.js";
import { InvalidOrganizationError } from "../domain/organization.entity.js";
import { KyselyOrganizationRepository } from "./organization-repository.kysely.js";

export async function createOrganizationController(req: Request, trx: Trx): Promise<TxResult> {
  const { name } = req.body as { name?: string };

  const useCase = new CreateOrganizationUseCase(
    new KyselyOrganizationRepository(trx),
    new OutboxEventPublisher(trx),
  );

  try {
    const organization = await useCase.execute({ name: name ?? "" });
    return { status: 201, body: { id: organization.id, name: organization.name } };
  } catch (err) {
    if (err instanceof InvalidOrganizationError) {
      return { status: 400, body: { error: err.message } };
    }
    throw err;
  }
}

export async function getOrganizationController(req: Request, trx: Trx): Promise<TxResult> {
  const identity = req.identity;
  const { id } = req.params as { id: string };

  // organizations has no tenant_id column (it IS the tenant boundary), so
  // ownership is enforced explicitly here rather than via RLS.
  if (!identity || identity.tenantId !== id) {
    return { status: 404, body: { error: "organization not found" } };
  }

  const organization = await new KyselyOrganizationRepository(trx).findById(id);
  if (!organization) {
    return { status: 404, body: { error: "organization not found" } };
  }

  return { status: 200, body: { id: organization.id, name: organization.name } };
}
