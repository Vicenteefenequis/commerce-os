## Why

`storefront/showcase` today renders a Venue's profile (photo, description, location) merged into the checkout page, above a flat ticket-selection UI. The Golden Path Tenants design (screens `02`/`03` mobile, `W2` web) shows something richer: a profile with stats (rating placeholder, active-offer count, today's capacity), a tabbed layout (Ofertas / Sobre / Localização), and — critically — an **Ofertas** tab that lists the venue's upcoming dated events ("Sexta Sertaneja · 19 set", "Samba do Quintal · 20 set") each with its own capacity bar and price, rather than one flat list of ticket variants. Picking an offer is what leads into the lote/quantity/checkout panel this plan redesigns next. Without this change, `storefront/showcase` has no way to present "here are the different nights you could come," which is the core of how this business actually sells (per-night capacity-limited entries, not a single evergreen ticket type).

## What Changes

- Restructure the venue's storefront page (`/loja/[tenantSlug]/[venueSlug]`) into a tabbed profile: **Ofertas** (default), **Sobre**, **Localização** — three tabs on every breakpoint, matching the design's own mobile-compact rule ("4 abas → 3 abas; avaliações entram dentro de Sobre"); a 4th **Avaliações** tab is left for `add-venue-ratings` to add later.
- Add profile stat tiles above the tabs: rating (stub/omitted until `add-venue-ratings` ships), count of currently active offers, and today's total remaining capacity across those offers.
- **Ofertas** tab: list each storefront-visible, currently-available Product as an offer — date block, title, time/rule subtitle, capacity bar (via the venue's resource-backed variants), price-from — reusing `OfferRow` from `storefront/design-system`. Selecting an offer scrolls to (desktop) or navigates to (mobile) that offer's lote/checkout panel — the panel itself is `redesign-checkout-lote-panel`'s scope, not this change's.
- **Sobre** tab: venue description, category, age restriction if set, and (once shipped) the ratings summary.
- **Localização** tab: address, city, and a static map/coordinates display using the `latitude`/`longitude` fields added in `expand-storefront-discovery-grid`.
- Out of scope: the lote-picker/checkout panel UI itself; ratings; waitlist for sold-out offers.

## Capabilities

### Modified Capabilities
- `storefront/showcase`: profile becomes a tabbed layout (Ofertas/Sobre/Localização) with stat tiles, instead of a single flat block of fields above the ticket list.
- `storefront/catalog`: storefront product listing gains an explicit "per-product aggregate capacity" figure so the Ofertas tab can show a capacity bar per offer without a second per-variant round trip.

## Impact

- `apps/web/app/loja/[tenantSlug]/[venueSlug]/page.tsx` restructured around the new tabbed layout, composed from `apply-ingressa-design-tokens`'s `OfferRow`/`CapacityBar` components.
- `apps/backend` storefront product listing endpoint extended to include an aggregate capacity figure per Product (reusing `capacity/resource`'s calculation, same approach as `expand-storefront-discovery-grid`'s per-result aggregation but at the single-product level here — no new capacity math).
- Depends on `apply-ingressa-design-tokens` for shared components; depends on `expand-storefront-discovery-grid` only for the `latitude`/`longitude` fields consumed by the Localização tab (falls back to address-only display if that change hasn't landed yet).
