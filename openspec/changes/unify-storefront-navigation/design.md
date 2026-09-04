## Context

See `proposal.md` for motivation. Relevant current-state constraints:

- `Organization` (tenant) has only `id`, `name`, `slug` — no logo/description. Tenant search results and the eventual home-page UI stay text-first unless a follow-up change adds tenant-level media.
- `Venue` rows are read under per-tenant Row Level Security; `Organization` rows are not (they define the tenant boundary itself), which is why `ListDiscoverableVenuesUseCase` fans out per-organization today but a tenant-name search does not need to.
- `apps/web/app/loja/[tenantSlug]/[venueSlug]/checkout-cart.tsx` already does the server-side product/availability fetch keyed by a `date` URL param and already renders per-variant price/capacity — the merge with showcase content and the fixed-footer total build on that existing fetch, not a new one.
- The payment page (`apps/web/app/pay/[orderId]/pay-form.tsx`) is documented in-code as deliberately scoped to payment only ("no cart/browsing/checkout-form UI"). Moving buyer-detail collection there is a scope change to that boundary, not just a UI addition — see the "Order creation timing" decision below.

## Goals / Non-Goals

**Goals:**
- Define how tenant name search matches approximately (accents, minor typos) without a new search infrastructure dependency.
- Define exactly when the Order is created relative to buyer-detail collection, now that those are split across two screens.
- Define the responsive behavior (mobile vs. desktop) for the merged showcase+cart screen, since the source request calls this out explicitly.

**Non-Goals:**
- Adding tenant-level branding (logo, description) to `Organization` — out of scope; search results and picker cards stay venue-photo-driven.
- Geolocation/map-based venue picking — explicitly deferred (user chose the rich-card list over map+list).
- Changing how capacity/reservations work — this change is UI composition and one new read endpoint, not a capacity model change.

## Decisions

### Tenant name matching: in-memory normalization, not a new DB extension
`OrganizationRepositoryPort.listAll()` already loads every tenant without RLS restriction. At current scale, the tenant-search use case normalizes both the query and each `Organization.name` (lowercase, strip diacritics via Unicode `NFD` + combining-mark removal) and matches by substring/prefix on the normalized strings — no `pg_trgm`/`unaccent` Postgres extension needed yet.
- **Alternative considered**: `unaccent`/`pg_trgm` at the SQL level. Rejected for now — it's a new DB extension and migration for a table that's still small; revisit if `listAll()` becomes a bottleneck (see Risks).

### Order creation moves to the payment step
Today `submitCheckout` (in `/loja/.../actions.ts`) creates the Order and its buyer record together, then redirects to `/pay/[orderId]`. Since buyer name/email are no longer known at cart-submit time, the Order SHALL be created at the point the payment page has both the cart selection (items, quantity, visit date — carried from the cart step, e.g. via the redirect's query params or a short-lived server-side cart token) and the buyer's name/email (just entered on the payment page), immediately before the Payment Provider call.
- **Alternative considered**: create the Order at cart-submit time with a placeholder buyer, then update buyer details on the payment page before payment. Rejected — it creates an Order with fabricated data that could leak into a support/admin view if the consumer abandons the payment page, and it complicates the "Order belongs to exactly one buyer" invariant with a mutate-after-create step.
- **Consequence**: `/pay/[orderId]` no longer exists as a route the moment the cart is submitted — the redirect target becomes a pre-payment page carrying the cart selection, which creates the Order server-side once buyer details are submitted, then shows the existing payment UI. The route may still be named `/pay/[orderId]` once the Order exists, but the buyer-detail sub-step precedes Order creation, not the Order id. (Naming detail for tasks.md / implementation, not a spec concern.)

### Merged showcase+cart screen layout: inline section on desktop, sticky footer + expandable section on mobile
Both breakpoints keep venue profile and ticket selection on one screen (no route change), matching the "no navigation between them" requirement:
- **Desktop (>= tablet breakpoint)**: profile content and the ticket-selection list render as two stacked sections on the same page; the fixed footer total sits at the bottom of the viewport.
- **Mobile (< tablet breakpoint)**: same stacked-section layout (not a bottom sheet) — a bottom sheet was considered but rejected because it re-introduces a modal-like context switch away from the profile content, working against the "keep the venue visible while choosing" goal from the original request. The fixed footer total is the mobile affordance that keeps the running total visible without obscuring the profile.
- **Alternative considered**: bottom sheet that slides over the profile on mobile. Rejected per above; also would need its own scroll-lock/focus-trap handling that a plain stacked section does not.

### `/vitrine` redirect is a permanent route-level redirect, not a client-side notice
`/vitrine/[tenantSlug]/[venueSlug]` becomes a Next.js route-level redirect (308/permanent) to `/loja/[tenantSlug]/[venueSlug]`, so old shared links keep working transparently and search engines/crawlers update their index over time, rather than rendering a "this page moved" interstitial.

## Risks / Trade-offs

- **[Risk]** In-memory tenant-name matching over `listAll()` degrades as the number of Organizations grows. → **Mitigation**: the eligibility filter (published venue + photo + active product) already narrows results before matching; revisit with `pg_trgm`/`unaccent` if tenant count grows enough to matter (no threshold defined yet — flagged as an open question below).
- **[Risk]** Moving Order creation to the payment step changes an existing invariant (`submitCheckout` today is the single place an Order is created for the storefront flow) — any code or admin tooling that assumed Order-creation-at-cart-submit needs to be checked. → **Mitigation**: covered explicitly in tasks.md as a review step over `apps/web/app/loja/.../actions.ts` and any backend usage of the storefront checkout use case.
- **[Risk]** Removing `/busca` and its filters (city/category) removes an exploratory browse path entirely; a consumer who doesn't know the tenant's name has no way to find it. → **Mitigation**: accepted per the product decision that this platform is tenant-first (users arrive via a known name or a shared/QR link), not a general marketplace browse; flagged here so it's a visible, deliberate trade-off rather than a silent regression.

## Open Questions

- At what Organization count does in-memory name matching need to move to a DB-level (`pg_trgm`/`unaccent`) search? No current tenant-count data to set a threshold — can be answered later without changing the spec or approach (either implementation satisfies the same requirements).
