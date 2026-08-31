import type { Product } from "./product.entity.js";

export interface CreateProductInput {
  id: string;
  tenantId: string;
  venueId: string;
  name: string;
  availableFrom?: Date | null;
  availableUntil?: Date | null;
  channels?: string[];
  variants: Array<{ id: string; name: string; priceCents: number; resourceId?: string | null }>;
}

export interface UpdateProductInput {
  availableFrom?: Date | null;
  availableUntil?: Date | null;
  channels?: string[];
}

export interface VariantLookup {
  id: string;
  productId: string;
  venueId: string;
  name: string;
  priceCents: number;
  resourceId: string | null;
}

export interface ProductRepositoryPort {
  create(input: CreateProductInput): Promise<Product>;
  findById(tenantId: string, id: string): Promise<Product | null>;
  listByVenue(tenantId: string, venueId: string): Promise<Product[]>;
  update(tenantId: string, id: string, changes: UpdateProductInput): Promise<Product>;
  addVariantPriceChange(
    tenantId: string,
    variantId: string,
    priceCents: number,
  ): Promise<{ variantId: string; previousPriceCents: number; newPriceCents: number }>;
  /** Current price/name/resource for a single variant - used by checkout to recalculate prices server-side (spec: commerce/checkout - "Server recalculates price"). */
  findVariantById(tenantId: string, variantId: string): Promise<VariantLookup | null>;
}
