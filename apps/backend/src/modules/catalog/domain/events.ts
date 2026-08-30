import type { DomainEvent } from "../../../events/domain-event.js";

export const PRODUCT_CREATED = "product.created";
export const PRODUCT_UPDATED = "product.updated";
export const PRODUCT_PRICE_CHANGED = "product.price_changed";

export interface ProductCreatedPayload {
  productId: string;
  venueId: string;
  name: string;
  actorUserId: string;
}

export interface ProductUpdatedPayload {
  productId: string;
  actorUserId: string;
  changes: Record<string, unknown>;
}

export interface ProductPriceChangedPayload {
  productId: string;
  variantId: string;
  previousPriceCents: number;
  newPriceCents: number;
  actorUserId: string;
}

export function productCreatedEvent(tenantId: string, payload: ProductCreatedPayload): DomainEvent {
  return { tenantId, type: PRODUCT_CREATED, payload: { ...payload } };
}

export function productUpdatedEvent(tenantId: string, payload: ProductUpdatedPayload): DomainEvent {
  return { tenantId, type: PRODUCT_UPDATED, payload: { ...payload } };
}

export function productPriceChangedEvent(
  tenantId: string,
  payload: ProductPriceChangedPayload,
): DomainEvent {
  return { tenantId, type: PRODUCT_PRICE_CHANGED, payload: { ...payload } };
}
