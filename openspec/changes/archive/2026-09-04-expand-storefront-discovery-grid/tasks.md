## 1. Backend: location and verification fields

- [x] 1.1 Add nullable `latitude`/`longitude` columns to the Venue table/model with a migration, and an update path through the existing venue profile-edit endpoint, validating ranges (spec: foundation/venue - Venue location coordinates are owner-editable)
- [x] 1.2 Add a nullable `verified` boolean column (default `false`) to the Organization table/model, with an update path restricted to the platform-admin authorization check (spec: foundation/organization - Organization verification is platform-admin-controlled)
- [x] 1.3 Add a platform-admin UI control (in `apps/web/app/platform/tenants`) to toggle an Organization's `verified` flag, and verify a non-platform-admin request to the same endpoint is denied

## 2. Backend: discovery query

- [x] 2.1 Extend the discovery query with optional filters: category, when (today/weekend/specific date), availability (has-room/include-sold-out), max price — combinable with the existing name match (spec: storefront/discovery - Discovery search supports combinable facet filters)
- [x] 2.2 Implement category facet counts computed against "all other active filters applied, this one excluded" (design.md D5), and verify counts change correctly as other filters are toggled but not when the category itself is toggled
- [x] 2.3 Implement distance calculation (haversine or equivalent) from a consumer-supplied lat/lng against each eligible Venue's coordinates, sorting ascending by nearest-venue distance per Organization, with venues lacking coordinates sorted last (spec: storefront/discovery - Discovery results sort by distance by default)
- [x] 2.4 Implement the "most-relevant-offer" capacity aggregation (design.md D4): for each result, select the resource-backed, currently-available product with the lowest remaining-capacity fraction and surface its percentage, reusing `capacity/resource`'s existing calculation; omit the figure when no such product exists
- [x] 2.5 Compute and include each result's lowest current price across its eligible venues' storefront-visible products
- [x] 2.6 Verify the eligibility rule (published + cover photo + available product) is applied before any facet filter, and that an ineligible Organization never appears regardless of filters (spec: storefront/discovery - Tenant discovery eligibility rule)

## 3. Frontend: discovery grid/list

- [x] 3.1 Build the desktop filter rail (when/category-with-counts/availability/price slider) inside the `apply-ingressa-design-tokens` desktop shell, wired to the extended discovery query
- [x] 3.2 Build the desktop 3-column result grid using `VenueCard`, showing verified badge, price-from, capacity bar, and distance
- [x] 3.3 Build the mobile filter chips + bottom sheet (using the mobile shell) exposing the same filters as the desktop rail
- [x] 3.4 Build the mobile 1-column result list reusing the same `VenueCard`
- [x] 3.5 Wire browser geolocation with a decline path that falls back to a city-level default location, and verify both paths produce a sorted result list
- [x] 3.6 Verify a result with no computable capacity renders without a capacity bar (not a zero or broken bar), and a result with no `verified` flag renders without the badge

## 4. Verification

- [x] 4.1 Manually verify the full filter matrix (each filter alone, and two combined) against seeded data with at least one sold-out, one near-capacity (>90%), and one unverified result
- [x] 4.2 Run `pnpm --filter web lint`, `pnpm --filter web build`, and the backend test suite, and verify all succeed
