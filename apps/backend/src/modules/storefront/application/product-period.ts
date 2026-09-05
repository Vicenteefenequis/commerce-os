import type { Product } from "../../catalog/domain/product.entity.js";

/**
 * ISO calendar date (`YYYY-MM-DD`) treated as a Product's own offer date for
 * capacity lookups, falling back to `now` when unset (add-tenant-profile-offers
 * design.md D1 - each offer/Product carries its own specific availability
 * date, unlike the checkout flow's customer-supplied visit date).
 */
export function productPeriod(product: Pick<Product, "availableFrom">, now: Date): string {
  const date = product.availableFrom ?? now;
  return date.toISOString().slice(0, 10);
}
