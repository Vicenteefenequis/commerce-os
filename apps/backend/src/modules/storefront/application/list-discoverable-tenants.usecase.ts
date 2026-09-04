import type { OrganizationRepositoryPort } from "../../organization/domain/ports.js";
import type { Venue } from "../../venue/domain/venue.entity.js";
import type { VenueRepositoryPort } from "../../venue/domain/ports.js";
import type { ProductRepositoryPort } from "../../catalog/domain/ports.js";
import type { TenantContextPort } from "../domain/ports.js";
import { normalizeName } from "./normalize-name.js";

const STOREFRONT_CHANNEL = "storefront";

export interface DiscoverableTenant {
  tenantSlug: string;
  organizationName: string;
}

export interface ListDiscoverableTenantsFilters {
  q?: string;
}

/**
 * spec: storefront/discovery - "Tenant discovery search is public and
 * cross-tenant", "Tenant discovery eligibility rule". `organizations`
 * carries no RLS (design.md), so `listAll()` reads every tenant in one
 * call; per-tenant eligibility still requires the same fan-out as
 * `ListDiscoverableVenuesUseCase` since Venues and Products are RLS-scoped.
 */
export class ListDiscoverableTenantsUseCase {
  constructor(
    private readonly organizations: OrganizationRepositoryPort,
    private readonly venues: VenueRepositoryPort,
    private readonly products: ProductRepositoryPort,
    private readonly tenantContext: TenantContextPort,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(filters: ListDiscoverableTenantsFilters = {}): Promise<DiscoverableTenant[]> {
    const organizations = await this.organizations.listAll();
    const normalizedQuery = filters.q ? normalizeName(filters.q) : undefined;
    const results: DiscoverableTenant[] = [];

    for (const organization of organizations) {
      if (normalizedQuery && !normalizeName(organization.name).includes(normalizedQuery)) continue;

      await this.tenantContext.setTenantId(organization.id);
      const venues = await this.venues.listByTenant(organization.id);

      let eligible = false;
      for (const venue of venues) {
        if (!this.isEligibleVenue(venue)) continue;

        const products = await this.products.listByVenue(organization.id, venue.id);
        const hasActiveProduct = products.some(
          (product) =>
            product.isVisibleOnChannel(STOREFRONT_CHANNEL) && product.isAvailableAt(this.now()),
        );
        if (hasActiveProduct) {
          eligible = true;
          break;
        }
      }

      if (!eligible) continue;

      results.push({
        tenantSlug: organization.slug,
        organizationName: organization.name,
      });
    }

    return results;
  }

  private isEligibleVenue(venue: Venue): boolean {
    return venue.published && Boolean(venue.coverPhotoUrl);
  }
}
