import type { Request } from "express";
import type { Trx, TxResult } from "../../../http/tx-route.js";
import { OutboxEventPublisher } from "../../../events/outbox-publisher.js";
import { GetConfigurationUseCase } from "../application/get-configuration.usecase.js";
import {
  ConfigurationPermissionDeniedError,
  SetConfigurationUseCase,
} from "../application/set-configuration.usecase.js";
import { InvalidConfigurationError } from "../domain/organization-configuration.entity.js";
import { KyselyOrganizationConfigurationRepository } from "./configuration-repository.kysely.js";

export async function getConfigurationController(req: Request, trx: Trx): Promise<TxResult> {
  const identity = req.identity;
  if (!identity) return { status: 401, body: { error: "authentication required" } };

  const { key } = req.params as { key: string };
  const config = await new GetConfigurationUseCase(
    new KyselyOrganizationConfigurationRepository(trx),
  ).execute(identity.tenantId, key);

  if (!config) return { status: 404, body: { error: "configuration key not found" } };
  return { status: 200, body: { key: config.key, value: config.value } };
}

export async function setConfigurationController(req: Request, trx: Trx): Promise<TxResult> {
  const identity = req.identity;
  if (!identity) return { status: 401, body: { error: "authentication required" } };

  const { key } = req.params as { key: string };
  const { value } = req.body as { value?: string };

  const useCase = new SetConfigurationUseCase(
    new KyselyOrganizationConfigurationRepository(trx),
    new OutboxEventPublisher(trx),
  );

  try {
    const config = await useCase.execute({
      tenantId: identity.tenantId,
      key,
      value: value ?? "",
      actingRoles: identity.roles,
      actorUserId: identity.userId,
    });
    return { status: 200, body: { key: config.key, value: config.value } };
  } catch (err) {
    if (err instanceof InvalidConfigurationError) {
      return { status: 400, body: { error: err.message } };
    }
    if (err instanceof ConfigurationPermissionDeniedError) {
      return { status: 403, body: { error: err.message } };
    }
    throw err;
  }
}
