import type { OrganizationRepositoryPort } from "../../organization/domain/ports.js";
import type { Venue } from "../../venue/domain/venue.entity.js";
import type { VenueRepositoryPort } from "../../venue/domain/ports.js";
import type { Product } from "../../catalog/domain/product.entity.js";
import type { ProductRepositoryPort } from "../../catalog/domain/ports.js";
import type { CapacityPeriodRepositoryPort } from "../../capacity/domain/ports.js";
import { calculateAvailableCapacity } from "../../capacity/domain/available-capacity.js";
import type { TenantContextPort } from "../domain/ports.js";
import { normalizeName } from "./normalize-name.js";
import { haversineDistanceKm } from "./haversine-distance.js";
import { overlapsWindow, windowForWhen, type WhenFilter } from "./when-window.js";

const STOREFRONT_CHANNEL = "storefront";

export type AvailabilityFilter = "has-room" | "include-sold-out";

export interface DiscoverableTenant {
  tenantSlug: string;
  organizationName: string;
  verified: boolean;
  category: string | null;
  priceFromCents: number | null;
  capacityPercentFull: number | null;
  distanceKm: number | null;
}

export interface CategoryFacetCount {
  category: string;
  count: number;
}

export interface ListDiscoverableTenantsResult {
  tenants: DiscoverableTenant[];
  categoryFacets: CategoryFacetCount[];
}

export interface ListDiscoverableTenantsFilters {
  q?: string;
  category?: string;
  when?: WhenFilter;
  /** Default "has-room": excludes Organizations with zero remaining capacity on every eligible offer. */
  availability?: AvailabilityFilter;
  maxPriceCents?: number;
  /** Consumer-supplied approximate location, used for distance sort/display and "weekend"/"specific date" window overlap is independent of this. */
  lat?: number;
  lng?: number;
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

interface OrganizationComputation {
  tenantSlug: string;
  organizationName: string;
  verified: boolean;
  category: string | null;
  priceFromCents: number | null;
  capacityPercentFull: number | null;
  distanceKm: number | null;
  eligible: boolean;
  whenMatch: boolean;
  hasRoom: boolean;
}

/**
 * spec: storefront/discovery - "Tenant discovery search is public and
 * cross-tenant", "Tenant discovery eligibility rule", "Discovery search
 * supports combinable facet filters", "Discovery search returns category
 * facet counts", "Discovery results sort by distance by default",
 * "Discovery results include price, capacity, and verification signals".
 * `organizations` carries no RLS (design.md), so `listAll()` reads every
 * tenant in one call; per-tenant eligibility and per-result data still
 * require the same fan-out as before since Venues/Products/Capacity are
 * RLS-scoped.
 */
export class ListDiscoverableTenantsUseCase {
  constructor(
    private readonly organizations: OrganizationRepositoryPort,
    private readonly venues: VenueRepositoryPort,
    private readonly products: ProductRepositoryPort,
    private readonly capacityPeriods: CapacityPeriodRepositoryPort,
    private readonly tenantContext: TenantContextPort,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(filters: ListDiscoverableTenantsFilters = {}): Promise<ListDiscoverableTenantsResult> {
    const organizations = await this.organizations.listAll();
    const normalizedQuery = filters.q ? normalizeName(filters.q) : undefined;
    const now = this.now();
    const period = isoDate(now);
    const whenWindow = windowForWhen(filters.when, now);
    const consumerLocation =
      filters.lat !== undefined && filters.lng !== undefined ? { lat: filters.lat, lng: filters.lng } : null;

    const computations: OrganizationComputation[] = [];

    for (const organization of organizations) {
      if (normalizedQuery && !normalizeName(organization.name).includes(normalizedQuery)) continue;

      await this.tenantContext.setTenantId(organization.id);
      const venues = await this.venues.listByTenant(organization.id);
      const eligibleVenues = venues.filter((venue) => this.isEligibleVenue(venue));
      if (eligibleVenues.length === 0) continue;

      const activeProducts: Product[] = [];
      let anyEligibleVenueMatched = false;
      for (const venue of eligibleVenues) {
        const products = await this.products.listByVenue(organization.id, venue.id);
        for (const product of products) {
          if (!product.isVisibleOnChannel(STOREFRONT_CHANNEL)) continue;
          if (product.isAvailableAt(now)) {
            activeProducts.push(product);
            anyEligibleVenueMatched = true;
          }
        }
      }

      if (!anyEligibleVenueMatched) continue;

      const whenMatch =
        !whenWindow ||
        activeProducts.some((product) =>
          overlapsWindow({ availableFrom: product.availableFrom, availableUntil: product.availableUntil }, whenWindow),
        );

      let priceFromCents: number | null = null;
      let hasRoom = false;
      let mostRelevantFraction: number | null = null;
      let capacityPercentFull: number | null = null;

      for (const product of activeProducts) {
        for (const variant of product.variants) {
          if (priceFromCents === null || variant.priceCents < priceFromCents) {
            priceFromCents = variant.priceCents;
          }

          if (!variant.resourceId) {
            hasRoom = true;
            continue;
          }

          const configured = await this.capacityPeriods.getConfiguredCapacity(
            organization.id,
            variant.resourceId,
            period,
          );
          const committed = await this.capacityPeriods.getCommittedAmount(
            organization.id,
            variant.resourceId,
            period,
          );
          const available = calculateAvailableCapacity(configured, committed);
          if (available > 0) hasRoom = true;

          const fraction = configured > 0 ? available / configured : 0;
          if (mostRelevantFraction === null || fraction < mostRelevantFraction) {
            mostRelevantFraction = fraction;
            capacityPercentFull = Math.round((1 - fraction) * 100);
          }
        }
      }

      const distanceKm = consumerLocation
        ? this.nearestVenueDistanceKm(eligibleVenues, consumerLocation)
        : null;

      computations.push({
        tenantSlug: organization.slug,
        organizationName: organization.name,
        verified: organization.verified,
        category: eligibleVenues[0]?.category ?? null,
        priceFromCents,
        capacityPercentFull,
        distanceKm,
        eligible: true,
        whenMatch,
        hasRoom,
      });
    }

    const availabilityMatches = (c: OrganizationComputation) =>
      filters.availability === "include-sold-out" || c.hasRoom;
    const priceMatches = (c: OrganizationComputation) =>
      filters.maxPriceCents === undefined ||
      (c.priceFromCents !== null && c.priceFromCents <= filters.maxPriceCents);

    const matchingOtherFilters = computations.filter(
      (c) => c.eligible && c.whenMatch && availabilityMatches(c) && priceMatches(c),
    );

    const tenants = matchingOtherFilters
      .filter((c) => !filters.category || c.category === filters.category)
      .sort((a, b) => {
        if (a.distanceKm === null && b.distanceKm === null) return 0;
        if (a.distanceKm === null) return 1;
        if (b.distanceKm === null) return -1;
        return a.distanceKm - b.distanceKm;
      })
      .map(
        ({ tenantSlug, organizationName, verified, category, priceFromCents, capacityPercentFull, distanceKm }) => ({
          tenantSlug,
          organizationName,
          verified,
          category,
          priceFromCents,
          capacityPercentFull,
          distanceKm,
        }),
      );

    const facetCounts = new Map<string, number>();
    for (const c of matchingOtherFilters) {
      if (!c.category) continue;
      facetCounts.set(c.category, (facetCounts.get(c.category) ?? 0) + 1);
    }
    const categoryFacets: CategoryFacetCount[] = Array.from(facetCounts.entries()).map(([category, count]) => ({
      category,
      count,
    }));

    return { tenants, categoryFacets };
  }

  private isEligibleVenue(venue: Venue): boolean {
    return venue.published && Boolean(venue.coverPhotoUrl);
  }

  private nearestVenueDistanceKm(
    eligibleVenues: Venue[],
    consumerLocation: { lat: number; lng: number },
  ): number | null {
    let nearest: number | null = null;
    for (const venue of eligibleVenues) {
      if (venue.latitude === null || venue.longitude === null) continue;
      const distance = haversineDistanceKm(consumerLocation, { lat: venue.latitude, lng: venue.longitude });
      if (nearest === null || distance < nearest) nearest = distance;
    }
    return nearest;
  }
}
