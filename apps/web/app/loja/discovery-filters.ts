export type AvailabilityFilter = "has-room" | "include-sold-out";

export interface DiscoveryFilters {
  q: string;
  category: string | null;
  when: string;
  availability: AvailabilityFilter;
  maxPriceCents: number | null;
  hasLocation: boolean;
}

export interface DiscoverableTenant {
  tenantSlug: string;
  organizationName: string;
  verified: boolean;
  category: string | null;
  priceFromCents: number | null;
  capacityPercentFull: number | null;
  distanceKm: number | null;
}

export interface CategoryFacet {
  category: string;
  count: number;
}

/**
 * São Paulo city center - city-level fallback when a consumer declines
 * geolocation (spec: storefront/discovery - "Venue without coordinates
 * sorts last"; task 3.5 - "falls back to a city-level default location").
 */
export const DEFAULT_CITY_LOCATION = { lat: -23.5505, lng: -46.6333 };

export function formatPriceFromCents(cents: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

export function formatDistanceKm(distanceKm: number): string {
  return `${distanceKm.toFixed(1)} km`;
}
