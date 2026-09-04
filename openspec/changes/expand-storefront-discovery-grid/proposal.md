## Why

`storefront/discovery` today is a name-only search box: a consumer who already knows or roughly remembers a tenant's name can find it, but there is no way to *browse* — "what's open near me tonight, under R$80, with room left." The Golden Path Tenants design (screens `01` mobile / `W1` web) is built entirely around that browse case: a filterable grid/list of tenants with category counts, a "today, near me" default, capacity and price visible on every card, and sold-out/near-capacity states handled explicitly instead of hidden. This is the entry point of the whole golden path — every other screen in this plan assumes a consumer arrived through this grid.

Note: the most recent discovery change (`unify-storefront-navigation`, archived 2026-09-04) deliberately removed city/category filtering, reasoning that discovery was "no longer an exploratory cross-tenant browse; it is a direct search for a known or approximately-named tenant." This change reverses that specific call for the reason above — the product now needs an exploratory browse surface — but keeps that change's other decision intact: results are still Organizations (tenants), not Venues, and still route to `storefront/tenant-entry`.

## What Changes

- Extend `storefront/discovery` with facet filters: category (with per-category result counts), "when" (today / this weekend / a specific date), availability ("has room now" vs "include sold out"), and price ceiling — combinable with the existing name search, all optional.
- Add distance-based sorting and display (nearest-first default) using a new `latitude`/`longitude` pair on `foundation/venue`, and a client-supplied approximate location (falls back to a city-level default when the consumer declines geolocation).
- Surface, per discovery result: a verified badge (new `verified` flag on `foundation/organization`), today's lowest available price across the tenant's eligible venues/products, and an aggregate capacity percentage computed from `capacity/resource`'s existing availability calculation, rendered with the sold-out/near-capacity visual states from `storefront/design-system`.
- Rework the discovery UI: desktop grid (3-column cards) with a persistent left filter rail; mobile list (1-column) with filter chips + bottom sheet — composed inside the shells from `apply-ingressa-design-tokens`.
- Out of scope: the tenant profile/offers page itself (`add-tenant-profile-offers`); ratings display (`add-venue-ratings` — the design's rating field on cards is a stub/omitted until that change lands).

## Capabilities

### Modified Capabilities
- `storefront/discovery`: adds facet filtering, distance sort/display, and richer per-result data (price-from, capacity, verified badge) on top of the existing name-search-over-Organizations behavior.

### New Capabilities
(none — `latitude`/`longitude` and `verified` are additive fields on existing capabilities, covered as MODIFIED requirements on `foundation/venue` and `foundation/organization`)

## Impact

- `foundation/venue`: new optional `latitude`/`longitude` fields, owner-editable like other profile fields.
- `foundation/organization`: new `verified` flag, platform-admin-controlled (not owner-editable — see design.md D3).
- `apps/backend` discovery query gains facet filtering, distance calculation/sort, and an aggregation step for price-from/capacity-pct per result.
- `apps/web/app/loja` (or a new `/descobrir` route — see design.md D1) gets the new grid/list UI, built on `apps/web/components/storefront/*` from `apply-ingressa-design-tokens`.
- Depends on `apply-ingressa-design-tokens` for `VenueCard`, `CapacityBar`, `FilterChip`, and both shells.
