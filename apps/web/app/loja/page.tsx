import { backendFetch } from "@/lib/backend-fetch";
import { DiscoveryContent } from "./discovery-content";
import type { AvailabilityFilter, CategoryFacet, DiscoverableTenant } from "./discovery-filters";

const PASSTHROUGH_PARAMS = ["q", "category", "when", "availability", "maxPriceCents", "lat", "lng"] as const;

/**
 * spec: storefront/discovery - the browse-first discovery grid (design.md
 * D1 - lives at the existing `/loja` root rather than a new `/descobrir`
 * route). Server Component: filters live in the URL (nextjs-frontend-
 * conventions - "a per-user selection... belongs in the URL's search
 * params"), so this page re-fetches on every filter/geolocation change and
 * hands the result down to the client-only interactive shell.
 */
export default async function DiscoveryGridPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams();
  for (const key of PASSTHROUGH_PARAMS) {
    const value = params[key];
    if (value) query.set(key, value);
  }

  const response = await backendFetch(`/storefront/discovery/tenants?${query.toString()}`);
  const body: { tenants?: DiscoverableTenant[]; categoryFacets?: CategoryFacet[] } = response.ok
    ? await response.json()
    : { tenants: [], categoryFacets: [] };

  return (
    <DiscoveryContent
      tenants={body.tenants ?? []}
      categoryFacets={body.categoryFacets ?? []}
      filters={{
        q: params.q ?? "",
        category: params.category ?? null,
        when: params.when ?? "today",
        availability: (params.availability as AvailabilityFilter) ?? "has-room",
        maxPriceCents: params.maxPriceCents ? Number(params.maxPriceCents) : null,
        hasLocation: Boolean(params.lat && params.lng),
      }}
    />
  );
}
