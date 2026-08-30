import { CONFIGURATION_CHANGED, type ConfigurationChangedPayload } from "../../configuration/domain/events.js";
import {
  PRODUCT_CREATED,
  PRODUCT_PRICE_CHANGED,
  PRODUCT_UPDATED,
  type ProductCreatedPayload,
  type ProductPriceChangedPayload,
  type ProductUpdatedPayload,
} from "../../catalog/domain/events.js";
import {
  RESOURCE_CAPACITY_SET,
  RESOURCE_CREATED,
  type ResourceCapacitySetPayload,
  type ResourceCreatedPayload,
} from "../../capacity/domain/events.js";
import { registerOutboxConsumer } from "../../../events/outbox-consumer-registry.js";
import { RecordAuditEntryUseCase } from "../application/record-audit-entry.usecase.js";
import { KyselyAuditRepository } from "./audit-repository.kysely.js";

/**
 * Registers Audit as a consumer of sensitive domain events (spec:
 * foundation/audit; catalog/product - "Product mutations are audited";
 * capacity/resource - "Resource and capacity mutations are audited").
 * organization.created has no identifiable actor (bootstrap endpoint) and
 * there is no permission-change event yet (no AssignRole use-case exists
 * in this change's scope). See design.md Open Questions.
 */
export function registerAuditConsumers(): void {
  registerOutboxConsumer(CONFIGURATION_CHANGED, async (event, trx) => {
    const payload = event.payload as unknown as ConfigurationChangedPayload;
    const useCase = new RecordAuditEntryUseCase(new KyselyAuditRepository(trx));
    await useCase.execute({
      tenantId: event.tenantId,
      actorUserId: payload.actorUserId,
      action: CONFIGURATION_CHANGED,
      entityType: "organization_configuration",
      entityId: null,
      metadata: { key: payload.key, value: payload.value },
      eventId: event.id,
    });
  });

  registerOutboxConsumer(PRODUCT_CREATED, async (event, trx) => {
    const payload = event.payload as unknown as ProductCreatedPayload;
    await new RecordAuditEntryUseCase(new KyselyAuditRepository(trx)).execute({
      tenantId: event.tenantId,
      actorUserId: payload.actorUserId,
      action: PRODUCT_CREATED,
      entityType: "product",
      entityId: payload.productId,
      metadata: { venueId: payload.venueId, name: payload.name },
      eventId: event.id,
    });
  });

  registerOutboxConsumer(PRODUCT_UPDATED, async (event, trx) => {
    const payload = event.payload as unknown as ProductUpdatedPayload;
    await new RecordAuditEntryUseCase(new KyselyAuditRepository(trx)).execute({
      tenantId: event.tenantId,
      actorUserId: payload.actorUserId,
      action: PRODUCT_UPDATED,
      entityType: "product",
      entityId: payload.productId,
      metadata: { changes: payload.changes },
      eventId: event.id,
    });
  });

  registerOutboxConsumer(PRODUCT_PRICE_CHANGED, async (event, trx) => {
    const payload = event.payload as unknown as ProductPriceChangedPayload;
    await new RecordAuditEntryUseCase(new KyselyAuditRepository(trx)).execute({
      tenantId: event.tenantId,
      actorUserId: payload.actorUserId,
      action: PRODUCT_PRICE_CHANGED,
      entityType: "product_variant",
      entityId: payload.variantId,
      metadata: {
        productId: payload.productId,
        previousPriceCents: payload.previousPriceCents,
        newPriceCents: payload.newPriceCents,
      },
      eventId: event.id,
    });
  });

  registerOutboxConsumer(RESOURCE_CREATED, async (event, trx) => {
    const payload = event.payload as unknown as ResourceCreatedPayload;
    await new RecordAuditEntryUseCase(new KyselyAuditRepository(trx)).execute({
      tenantId: event.tenantId,
      actorUserId: payload.actorUserId,
      action: RESOURCE_CREATED,
      entityType: "resource",
      entityId: payload.resourceId,
      metadata: { venueId: payload.venueId, name: payload.name, defaultCapacity: payload.defaultCapacity },
      eventId: event.id,
    });
  });

  registerOutboxConsumer(RESOURCE_CAPACITY_SET, async (event, trx) => {
    const payload = event.payload as unknown as ResourceCapacitySetPayload;
    await new RecordAuditEntryUseCase(new KyselyAuditRepository(trx)).execute({
      tenantId: event.tenantId,
      actorUserId: payload.actorUserId,
      action: RESOURCE_CAPACITY_SET,
      entityType: "resource",
      entityId: payload.resourceId,
      metadata: { period: payload.period, capacity: payload.capacity },
      eventId: event.id,
    });
  });
}
