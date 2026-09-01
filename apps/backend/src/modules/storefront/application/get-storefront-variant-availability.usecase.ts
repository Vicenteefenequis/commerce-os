import type { ProductRepositoryPort } from "../../catalog/domain/ports.js";
import type { GetAvailableCapacityUseCase } from "../../capacity/application/get-available-capacity.usecase.js";

export class VariantNotFoundError extends Error {
  constructor() {
    super("variant not found");
  }
}

export interface StorefrontVariantAvailability {
  variantId: string;
  constrained: boolean;
  availableCapacity: number | null;
}

/** spec: storefront/catalog - "Storefront availability lookup is public". */
export class GetStorefrontVariantAvailabilityUseCase {
  constructor(
    private readonly products: ProductRepositoryPort,
    private readonly availability: GetAvailableCapacityUseCase,
  ) {}

  async execute(tenantId: string, variantId: string, period: string): Promise<StorefrontVariantAvailability> {
    const variant = await this.products.findVariantById(tenantId, variantId);
    if (!variant) throw new VariantNotFoundError();

    if (!variant.resourceId) {
      return { variantId, constrained: false, availableCapacity: null };
    }

    const availableCapacity = await this.availability.execute(tenantId, variant.resourceId, period);
    return { variantId, constrained: true, availableCapacity };
  }
}
