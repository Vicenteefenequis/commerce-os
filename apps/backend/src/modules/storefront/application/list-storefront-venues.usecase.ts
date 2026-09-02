import type { Organization } from "../../organization/domain/organization.entity.js";
import type { OrganizationRepositoryPort } from "../../organization/domain/ports.js";
import type { Venue } from "../../venue/domain/venue.entity.js";
import type { VenueRepositoryPort } from "../../venue/domain/ports.js";
import type { TenantContextPort } from "../domain/ports.js";
import { TenantNotFoundError } from "./resolve-storefront-tenant.usecase.js";

export { TenantNotFoundError };

export interface StorefrontVenuesResult {
  tenant: Organization;
  venues: Venue[];
}

/** spec: storefront/catalog - "Storefront venue listing is public". */
export class ListStorefrontVenuesUseCase {
  constructor(
    private readonly organizations: OrganizationRepositoryPort,
    private readonly venues: VenueRepositoryPort,
    private readonly tenantContext: TenantContextPort,
  ) {}

  async execute(tenantSlug: string): Promise<StorefrontVenuesResult> {
    const tenant = await this.organizations.findBySlug(tenantSlug);
    if (!tenant) throw new TenantNotFoundError();

    await this.tenantContext.setTenantId(tenant.id);
    const venues = await this.venues.listByTenant(tenant.id);
    return { tenant, venues };
  }
}
