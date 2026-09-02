import type { ProductRepositoryPort } from "../../catalog/domain/ports.js";
import type { GetAvailableCapacityUseCase } from "../../capacity/application/get-available-capacity.usecase.js";
import type { OrganizationRepositoryPort } from "../../organization/domain/ports.js";
import type { VenueRepositoryPort } from "../../venue/domain/ports.js";
import type { TenantContextPort } from "../domain/ports.js";
import { TenantNotFoundError } from "./resolve-storefront-tenant.usecase.js";
import { VenueNotFoundError } from "./list-storefront-products.usecase.js";

export { TenantNotFoundError, VenueNotFoundError };

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
    private readonly organizations: OrganizationRepositoryPort,
    private readonly venues: VenueRepositoryPort,
    private readonly products: ProductRepositoryPort,
    private readonly availability: GetAvailableCapacityUseCase,
    private readonly tenantContext: TenantContextPort,
  ) {}

  async execute(
    tenantSlug: string,
    venueSlug: string,
    variantId: string,
    period: string,
  ): Promise<StorefrontVariantAvailability> {
    const tenant = await this.organizations.findBySlug(tenantSlug);
    if (!tenant) throw new TenantNotFoundError();

    await this.tenantContext.setTenantId(tenant.id);

    const venue = await this.venues.findBySlug(tenant.id, venueSlug);
    if (!venue) throw new VenueNotFoundError();

    const variant = await this.products.findVariantById(tenant.id, variantId);
    if (!variant) throw new VariantNotFoundError();

    if (!variant.resourceId) {
      return { variantId, constrained: false, availableCapacity: null };
    }

    const availableCapacity = await this.availability.execute(tenant.id, variant.resourceId, period);
    return { variantId, constrained: true, availableCapacity };
  }
}
