## 1. Backend

- [ ] 1.1 Add a nullable `ageRestriction` integer column to the Venue table/model with a migration and validation (non-negative) on the existing profile-edit endpoint (spec: foundation/venue - Venue age restriction is owner-editable)
- [ ] 1.2 Extend the storefront product listing endpoint to compute and include an aggregate capacity percentage per Product with resource-backed variants, reusing `capacity/resource`'s calculation, omitted when no variant is resource-backed (spec: storefront/catalog - Product with resource-backed variants includes an aggregate capacity figure)
- [ ] 1.3 Extend the storefront Venue-profile read (backing `storefront/showcase`) to include the count of currently-available offers and their combined remaining capacity

## 2. Frontend: tabbed profile

- [ ] 2.1 Restructure `apps/web/app/loja/[tenantSlug]/[venueSlug]/page.tsx` into a tabbed layout (Ofertas default / Sobre / Localização), reusing the desktop/mobile shells from `apply-ingressa-design-tokens`
- [ ] 2.2 Build the stat-tile row (active-offer count, aggregate remaining capacity) above the tabs, omitting a rating tile (reserved for `add-venue-ratings`)
- [ ] 2.3 Implement the Ofertas tab using `OfferRow`: date block, title, capacity bar (when present), price-from; sorted by availability window ascending
- [ ] 2.4 Implement the Sobre tab: description, category, age restriction (when set)
- [ ] 2.5 Implement the Localização tab: address, city (uses `latitude`/`longitude` for a map view if `expand-storefront-discovery-grid` has landed; falls back to address-only text otherwise)
- [ ] 2.6 Verify unset profile fields (description, category, age restriction, cover photo) are omitted, not shown as placeholders or errors (spec: storefront/showcase - Unset profile fields are omitted, not shown as errors)
- [ ] 2.7 Verify a venue with zero currently-available offers shows the Ofertas tab's explicit empty state

## 3. Verification

- [ ] 3.1 Manually verify the tab layout on both a desktop and a mobile viewport, confirming exactly three tabs on each
- [ ] 3.2 Run `pnpm --filter web lint`, `pnpm --filter web build`, and the backend test suite, and verify all succeed
