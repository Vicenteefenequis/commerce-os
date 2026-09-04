import type { Organization } from "../../organization/domain/organization.entity.js";
import type { OrganizationRepositoryPort } from "../../organization/domain/ports.js";
import type { Venue } from "../../venue/domain/venue.entity.js";
import type { VenueRepositoryPort } from "../../venue/domain/ports.js";
import type { TenantContextPort } from "../domain/ports.js";
import { TenantNotFoundError } from "./resolve-storefront-tenant.usecase.js";
import { VenueNotFoundError } from "./list-storefront-products.usecase.js";

export { TenantNotFoundError, VenueNotFoundError };

export interface StorefrontVenueProfileResult {
  tenant: Organization;
  venue: Venue;
}

/**
 * spec: storefront/showcase - "Showcase page is public and account-less",
 * "Showcase page is reachable regardless of publish status", "isolated by
 * tenant". Deliberately ignores `published` - unlike discovery, the
 * showcase page is reachable by direct link independent of publish status.
 */
export class GetStorefrontVenueProfileUseCase {
  constructor(
    private readonly organizations: OrganizationRepositoryPort,
    private readonly venues: VenueRepositoryPort,
    private readonly tenantContext: TenantContextPort,
  ) {}

  async execute(tenantSlug: string, venueSlug: string): Promise<StorefrontVenueProfileResult> {
    const tenant = await this.organizations.findBySlug(tenantSlug);
    if (!tenant) throw new TenantNotFoundError();

    await this.tenantContext.setTenantId(tenant.id);

    const venue = await this.venues.findBySlug(tenant.id, venueSlug);
    if (!venue) throw new VenueNotFoundError();

    return { tenant, venue };
  }
}
