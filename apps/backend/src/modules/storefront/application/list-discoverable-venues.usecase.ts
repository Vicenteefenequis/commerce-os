import type { OrganizationRepositoryPort } from "../../organization/domain/ports.js";
import type { Venue } from "../../venue/domain/venue.entity.js";
import type { VenueRepositoryPort } from "../../venue/domain/ports.js";
import type { ProductRepositoryPort } from "../../catalog/domain/ports.js";
import type { TenantContextPort } from "../domain/ports.js";

const STOREFRONT_CHANNEL = "storefront";

export interface DiscoverableVenue {
  tenantSlug: string;
  organizationName: string;
  venueSlug: string;
  venueName: string;
  category: string | null;
  city: string | null;
  coverPhotoUrl: string;
}

export interface ListDiscoverableVenuesFilters {
  city?: string;
  category?: string;
}

/**
 * spec: storefront/discovery - "Discovery search is public and
 * cross-tenant", "Discovery eligibility rule", "filters by city and
 * category". Fans out over every Organization rather than issuing one
 * cross-tenant SQL query - see design.md "Discovery reads by fanning out
 * per-tenant, not with a single cross-tenant SQL query" for why a single
 * query cannot read more than one tenant's rows under Row Level Security.
 */
export class ListDiscoverableVenuesUseCase {
  constructor(
    private readonly organizations: OrganizationRepositoryPort,
    private readonly venues: VenueRepositoryPort,
    private readonly products: ProductRepositoryPort,
    private readonly tenantContext: TenantContextPort,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(filters: ListDiscoverableVenuesFilters = {}): Promise<DiscoverableVenue[]> {
    const organizations = await this.organizations.listAll();
    const results: DiscoverableVenue[] = [];

    for (const organization of organizations) {
      await this.tenantContext.setTenantId(organization.id);
      const venues = await this.venues.listByTenant(organization.id);

      for (const venue of venues) {
        if (!this.isEligible(venue)) continue;
        if (filters.city && venue.city !== filters.city) continue;
        if (filters.category && venue.category !== filters.category) continue;

        const products = await this.products.listByVenue(organization.id, venue.id);
        const hasActiveProduct = products.some(
          (product) =>
            product.isVisibleOnChannel(STOREFRONT_CHANNEL) && product.isAvailableAt(this.now()),
        );
        if (!hasActiveProduct) continue;

        results.push({
          tenantSlug: organization.slug,
          organizationName: organization.name,
          venueSlug: venue.slug,
          venueName: venue.name,
          category: venue.category,
          city: venue.city,
          coverPhotoUrl: venue.coverPhotoUrl as string,
        });
      }
    }

    return results;
  }

  private isEligible(venue: Venue): boolean {
    return venue.published && Boolean(venue.coverPhotoUrl);
  }
}
