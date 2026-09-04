## Why

The consumer path from "find a place" to "have a ticket" today spans four separate navigations (`/busca` → `/vitrine/...` → `/loja/...` → `/pay/...`), and the first of those, `/busca`, has no entry point anywhere in the app — it only works if a consumer types the URL directly. Consumers also can't tell price or availability from a listing before clicking in, and `/vitrine` is a pure marketing stop with no purchase action of its own. This change makes tenant search the real entry point (from `/`), collapses the showcase and ticket-selection screens into one, and removes navigation steps that ask for the same thing twice.

## What Changes

- Add a tenant search widget to `/` (name-approximate, accent-insensitive match, e.g. "bar do joao" finds "Bar do João"), alongside the existing B2B sections — **new backend endpoint** for tenant search (no cross-tenant SQL/RLS complication: `Organization` isn't tenant-scoped, so `listAll()` plus an in-memory or `ILIKE`/`unaccent` match is sufficient).
- **BREAKING**: Remove `/busca` (cross-tenant venue search by city/category). It has no entry point today and is superseded by tenant search.
- Evolve the `/loja/[tenantSlug]` venue picker (shown when a tenant has 2+ Venues) from a plain name list into rich cards: venue photo, address, category — no more "clicking in the dark."
- Merge the showcase page's content (photo, description, address) into `/loja/[tenantSlug]/[venueSlug]`, directly above the ticket-selection UI, so browsing and buying happen on one screen instead of two.
- **BREAKING**: `/vitrine/[tenantSlug]/[venueSlug]` becomes a redirect to `/loja/[tenantSlug]/[venueSlug]`, preserving already-shared links.
- `/loja/[tenantSlug]` (the direct/shared-link entry point, single-venue auto-redirect) is kept as-is as a second entry door, now also the landing target for home search results.
- On the merged `/loja/[tenantSlug]/[venueSlug]` page: show a running total in a fixed footer bar that updates live as quantity changes (replacing the total that today only appears after scrolling to the bottom of the form); when a venue has exactly one ticket type and every capacity-bound line is date-independent ("today" only), default quantity to 1 and skip the date step.
- Move buyer name/email collection from the cart step (`/loja/.../[venueSlug]`) to the payment step (`/pay/[orderId]`), so identifying info is asked only once the consumer is committed to paying.

## Capabilities

### Modified Capabilities

- `marketing/landing-page`: `/` gains a tenant-search entry point (input, approximate-name results) alongside its existing B2B recruitment sections.
- `storefront/discovery`: the public cross-tenant search changes from searching Venues (by city/category) to searching Organizations/tenants (by approximate name); results link to the tenant entry page (`storefront/tenant-entry`) instead of the showcase page.
- `storefront/tenant-entry`: the multi-venue picker becomes rich cards (photo, address, category) instead of a plain name list.
- `storefront/showcase`: showcase content (photo, description, address) is now rendered as part of `/loja/[tenantSlug]/[venueSlug]` instead of its own page; `/vitrine/[tenantSlug]/[venueSlug]` becomes a redirect to that URL.
- `storefront/checkout`: the cart page displays the venue's profile above the ticket list; shows a live-updating total in a fixed footer; defaults to quantity 1 and skips date selection when the venue has one date-independent ticket type; no longer collects buyer name/email (moved to the payment step).
- `payments/payment`: the payment page now collects the consumer's name and email before the Order is created and payment is initiated (previously collected on the cart step).

## Impact

- **Backend**: new tenant-search use case/route (e.g. `GET /storefront/discovery/tenants?q=`) using `OrganizationRepositoryPort.listAll()` plus approximate-name matching; the existing `ListDiscoverableVenuesUseCase` and `/storefront/discovery/venues` route are removed.
- **Frontend routes**: `apps/web/app/busca/*` removed; `apps/web/app/vitrine/[tenantSlug]/[venueSlug]/page.tsx` becomes a redirect; `apps/web/app/loja/[tenantSlug]/page.tsx` (picker) and `apps/web/app/loja/[tenantSlug]/[venueSlug]/page.tsx` + `checkout-cart.tsx` (merged showcase + cart + fixed-footer total) are substantially reworked; `apps/web/app/(marketing)/page.tsx` gains the search widget; `apps/web/app/pay/[orderId]/pay-form.tsx` gains a buyer-info step.
- **Data**: no schema change identified yet for tenant search (matching runs over existing `Organization.name`); to be confirmed in design.md whether `unaccent`/`pg_trgm` is needed at the Postgres level or in-memory normalization suffices at current scale.
