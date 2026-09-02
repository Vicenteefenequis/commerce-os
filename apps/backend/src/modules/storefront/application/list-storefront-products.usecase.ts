import type { Product } from "../../catalog/domain/product.entity.js";
import type { ProductRepositoryPort } from "../../catalog/domain/ports.js";
import type { Organization } from "../../organization/domain/organization.entity.js";
import type { OrganizationRepositoryPort } from "../../organization/domain/ports.js";
import type { Venue } from "../../venue/domain/venue.entity.js";
import type { VenueRepositoryPort } from "../../venue/domain/ports.js";
import type { TenantContextPort } from "../domain/ports.js";
import { TenantNotFoundError } from "./resolve-storefront-tenant.usecase.js";

export { TenantNotFoundError };

export class VenueNotFoundError extends Error {
  constructor() {
    super("venue not found");
  }
}

export interface StorefrontProductsResult {
  tenant: Organization;
  venue: Venue;
  products: Product[];
}

const STOREFRONT_CHANNEL = "storefront";

/** spec: storefront/catalog - "Storefront product listing respects channel visibility and availability window". */
export class ListStorefrontProductsUseCase {
  constructor(
    private readonly organizations: OrganizationRepositoryPort,
    private readonly venues: VenueRepositoryPort,
    private readonly products: ProductRepositoryPort,
    private readonly tenantContext: TenantContextPort,
  ) {}

  async execute(
    tenantSlug: string,
    venueSlug: string,
    now: Date = new Date(),
  ): Promise<StorefrontProductsResult> {
    const tenant = await this.organizations.findBySlug(tenantSlug);
    if (!tenant) throw new TenantNotFoundError();

    await this.tenantContext.setTenantId(tenant.id);

    const venue = await this.venues.findBySlug(tenant.id, venueSlug);
    if (!venue) throw new VenueNotFoundError();

    const products = await this.products.listByVenue(tenant.id, venue.id);
    const visible = products.filter(
      (product) => product.isVisibleOnChannel(STOREFRONT_CHANNEL) && product.isAvailableAt(now),
    );
    return { tenant, venue, products: visible };
  }
}
