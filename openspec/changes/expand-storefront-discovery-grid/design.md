## Context

`storefront/discovery` currently returns `{ name, tenantEntryLink }` for each matching Organization, filtered only by the tenant-discovery eligibility rule (a published venue with a cover photo and an available product) and an approximate name match. The design (screens `01`, `W1`) needs a much richer result: distance, category, today's price-from, today's capacity, and a verified badge — plus server-side facets (category counts) driving the filter rail/chips. See proposal.md for the reversal-of-a-prior-decision context; see `openspec/specs/storefront/discovery`, `foundation/venue`, `foundation/organization`, `capacity/resource` for current behavior.

## Goals / Non-Goals

**Goals:**
- One discovery endpoint that supports: name search (existing), category filter, when filter (today/weekend/date), availability filter, price-ceiling filter, and distance sort — all combinable and all optional (no filter = today's original behavior, minus the richer per-card data).
- Category facet counts that reflect the *other* active filters (so counts narrow as filters are applied), matching the design's `Bares 42 / Baladas 18 / Shows 9 / Restaurantes 27` sidebar.
- Distance computed server-side from a consumer-supplied lat/lng (or a city-level fallback) against each eligible venue's new `latitude`/`longitude`.

**Non-Goals:**
- Ratings/review data on cards (`add-venue-ratings` is a separate change; cards simply omit the rating line until it lands).
- Geocoding an address into lat/lng automatically — venue owners enter coordinates manually for this change (see D2).
- Real-time (push/websocket) capacity updates on the grid — capacity is computed at request time, refreshed on filter change or manual reload, consistent with how `storefront/checkout` already handles capacity display.

## Decisions

### D1: Discovery grid lives at the existing `/loja` search surface, not a new route
The design mockup's URL bar shows `ingressa.app/descobrir`, but this repo's storefront root is `/loja`. Introducing a second public root (`/descobrir`) alongside `/loja` would fragment the storefront's URL space for a purely cosmetic match to the mockup. The grid becomes the landing UI at `/loja` (browse-first) with the existing name search folded in as the search field within that same page, rather than a separate page.

### D2: `latitude`/`longitude` are owner-entered, not derived
Adding automatic geocoding (address string → coordinates) pulls in a third-party geocoding dependency and its failure modes (rate limits, ambiguous addresses) for a field that a venue owner can enter once, correctly, when they know their own address. `foundation/venue`'s profile-edit surface gains two additional optional numeric fields; a venue without coordinates set is simply excluded from distance sort/display (falls to the end of "nearest first," or is omitted from a "within N km" filter) rather than blocking anything.

### D3: `verified` is platform-admin-only, not owner-editable
Unlike `description`/`address`/`category` (owner-editable per `foundation/venue`), `verified` is a trust signal the platform grants, not something a tenant sets on itself — otherwise the badge is meaningless. It is added to `foundation/organization` (the badge is shown at the Organization/tenant level in the design, next to the tenant name, not per-venue) and is settable only through the existing platform-admin authorization path (`foundation/platform-admin`).

### D4: Capacity percentage shown on a discovery card is an aggregate, computed the same way everywhere
A tenant may have multiple eligible venues and each venue multiple resource-backed products. The card shows one number: the capacity-weighted average percentage-full across the tenant's *currently most relevant* offer (today's nearest-in-time, resource-backed product with the lowest remaining-capacity fraction — i.e. the one closest to selling out, since that's the signal the design's "62% LOTADO / 94% LOTADO" badges are for: urgency). This reuses `capacity/resource`'s existing available-capacity calculation per Resource/period; no new capacity math, only an aggregation/selection rule at the discovery layer.

### D5: Facet counts are computed against the filtered-minus-itself result set
Each facet's displayed count (e.g. "Bares 42") reflects how many results would match if every *other* active filter were applied but that facet itself were not — standard faceted-search behavior, so selecting "Bares" doesn't make its own count collapse to the post-filter total.

## Risks / Trade-offs

- [Risk] Owner-entered lat/lng can be wrong (typo'd coordinates) → Mitigation: out of scope to validate against the address string in this change; flagged as a follow-up if it proves to be a real data-quality problem in practice.
- [Risk] "Most relevant offer" aggregation (D4) is a product judgment call, not a spec-derivable rule → Mitigation: documented explicitly here and in the spec delta below so it's a known, revisitable decision rather than an implicit implementation detail.
- [Risk] Reintroducing filters partially reverses a recent, deliberate simplification (`unify-storefront-navigation`) → Mitigation: called out explicitly in proposal.md's Why section so the history isn't lost; this change's filters operate on the grid view, not as a second search mechanism competing with name search.
