## Context

`storefront/showcase` (merged into `storefront/checkout`'s cart step per the recent `unify-storefront-navigation` change) renders venue profile fields as a flat block above a flat ticket-variant list. The design's `02`/`03`/`W2` screens model a venue as having multiple discrete, dated **offers** (events), each with its own capacity and lote/tier breakdown — not one product with several variants and a single shared date, which is `storefront/checkout`'s current model. See `openspec/specs/storefront/showcase`, `storefront/catalog`, `catalog/product`, `capacity/resource` for current behavior.

## Goals / Non-Goals

**Goals:**
- A tabbed profile (Ofertas/Sobre/Localização) replacing the current flat block, without breaking the "one screen, no navigation between profile and purchase" requirement `storefront/checkout` already established.
- An Ofertas tab that lists each storefront-visible Product as a dated offer with its own capacity bar and price, giving the consumer the "which night" decision the design puts front and center.
- Stat tiles (active-offer count, today's aggregate capacity) computed from data already available via `storefront/catalog`.

**Non-Goals:**
- The lote-selection/checkout panel a selected offer opens into — that is `redesign-checkout-lote-panel`'s scope. This change only gets the consumer from "browsing offers" to "an offer is selected"; what renders once selected is out of scope here.
- Ratings — the Avaliações tab and rating stat tile are `add-venue-ratings`'s scope; this change reserves the tab slot but does not implement it.

## Decisions

### D1: "Offer" is a Product, not a new domain concept
The design's "Sexta Sertaneja · 19 set" maps directly to an existing `catalog/product` Product: it has a name, a price (via variants = lotes), an availability window (that specific date/time), and optionally a Resource-linked variant for capacity. No new backend entity is introduced — the Ofertas tab is a presentation of `storefront/catalog`'s existing product listing, grouped and sorted by each product's availability window, with each product's variants presented as its lotes rather than as separate top-level line items.

This does mean `storefront/checkout`'s current "one shared visit date for the whole cart" model doesn't apply once an offer/product already carries its own fixed date — that reconciliation is `redesign-checkout-lote-panel`'s decision to make, flagged there, not solved here.

### D2: Tabs stay at three (Ofertas/Sobre/Localização) on every breakpoint
The design itself specifies this exact reduction for mobile ("4 abas → 3 abas; avaliações entram dentro de Sobre"). Rather than build a 4-tab desktop layout now and collapse it for mobile later, this change ships the 3-tab layout everywhere from the start — `add-venue-ratings` can promote Avaliações to its own tab on wider breakpoints when it lands, as that change's own decision.

### D3: Per-product aggregate capacity is computed once, server-side, at listing time
`storefront/catalog`'s product listing already returns each Product's variants with price; this change adds one more field per Product — an aggregate capacity percentage across its resource-backed variants (or omitted if none are resource-backed) — computed the same way as `expand-storefront-discovery-grid`'s per-result figure, just scoped to one product's variants instead of aggregated across a tenant's offers. This avoids the Ofertas tab making N additional availability-lookup calls (one per offer) on page load.

### D4: Age restriction is a new optional Venue field, owner-editable
The design shows "18+" as a profile fact (Sobre tab / header chip). Added as `ageRestriction` (nullable integer, e.g. `18`) on `foundation/venue`, following the same owner-editable pattern as `category`/`description`. Absent when not set — omitted from display, not shown as "0+" or an error.

## Risks / Trade-offs

- [Risk] Grouping products as "offers" changes how a venue owner should think about creating catalog entries (one Product per date/event, not one Product with many variants for different ticket types across dates) → Mitigation: this is a display-layer interpretation of existing data, not a new constraint on `catalog/product`; a venue owner can still model products however they choose, the Ofertas tab just presents whatever exists grouped by availability window.
- [Risk] Server-side aggregate capacity (D3) adds a computation cost to every storefront product listing call, even when the Ofertas tab isn't the active tab → Mitigation: acceptable — it reuses `capacity/resource`'s existing per-resource calculation, which is already called during checkout's availability lookup; this just moves it earlier and caches it per listing request.
