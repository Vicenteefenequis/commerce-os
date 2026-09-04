## Context

`storefront/checkout`'s cart step models a venue's variants as a flat list under one shared visit date, with a fixed footer summary. `add-tenant-profile-offers` introduces "offers" (dated Products) as the primary browsing unit. The design's `W2`/`03`/`M` screens assume the consumer has already picked one offer and now sees a panel scoped to *that offer's* lotes only. These two models need to coexist: a venue with dated offers uses offer-scoped selection; a venue without them (an evergreen ticket type) keeps the existing shared-date flow untouched. See `openspec/specs/storefront/checkout` and `commerce/checkout` for current behavior.

## Goals / Non-Goals

**Goals:**
- Offer-scoped panel: once an offer is selected (from `add-tenant-profile-offers`'s Ofertas tab), the panel shows only that offer's lote choices, quantity stepper, and price breakdown — no separate visit-date field, since the offer's own availability window fixes the date.
- Desktop: panel fixed to the right of the offer list (`W2`). Mobile: a sticky mini-bar (price-from + CTA) that opens a bottom sheet with the same panel content (`M`).
- Existing shared-visit-date flow (venues without dated offers) is unchanged by this change.

**Non-Goals:**
- Introducing a real service-fee charge in `commerce/checkout` — see D2; that is explicitly deferred.
- Multi-offer carts (selecting lotes across two different offers in one checkout) — the design shows single-offer selection only; out of scope until requested.

## Decisions

### D1: Offer selection is a new, alternative entry into the existing cart step, not a new page
When the selected Product has a fixed availability window (an "offer," per `add-tenant-profile-offers` D1), the cart step SHALL NOT show the shared visit-date field defined in `storefront/checkout`'s "Storefront checkout shows a clear order summary before payment" requirement, and SHALL instead scope quantity/capacity to that offer's variants alone. A venue whose products are not organized as dated offers continues to see the existing shared-date, flat-variant-list flow exactly as today. This is additive: the existing requirements gain a qualifying condition ("when the venue's products are not dated offers") rather than being replaced.

### D2: The price breakdown shows only what the server will actually charge — no fabricated fee line
The design's mockup shows a "Taxa de serviço" (service fee) line, but `commerce/checkout` has no fee concept: it recalculates only variant price. Showing a fee line the backend doesn't charge would make the displayed total lie about what payment actually collects. This change's price breakdown shows subtotal (lote price × quantity) and total, with subtotal equal to total, and does not render a service-fee line. Introducing a real fee is a separate, backend-first change (`commerce/checkout` would need a fee model) — explicitly out of scope here, flagged for a future change if the business wants one.

### D3: Quantity stepper is capped by the same remaining-capacity rule as today
`storefront/checkout`'s existing "prevents selecting more than the available capacity" and "sold-out variant is disabled" requirements apply unchanged to the offer-scoped lote picker — a lote is just a variant, and its cap/sold-out behavior doesn't change because of how it's presented.

### D4: Desktop panel and mobile bottom sheet share one component
Both surfaces render the same `OfferCheckoutPanel` component (capacity bar, lote list, stepper, breakdown, CTA); desktop places it in a fixed-position side column, mobile renders it inside the bottom sheet from `apply-ingressa-design-tokens`'s mobile shell, triggered by a sticky mini-bar showing price-from + CTA. No separate mobile-specific panel implementation to keep in sync.

## Risks / Trade-offs

- [Risk] Omitting the fee line diverges visually from the design mockup → Mitigation: intentional — an inaccurate fee is worse than no fee line; documented here so it's a known, revisitable gap, not silently dropped.
- [Risk] Two coexisting cart-selection models (offer-scoped vs. shared-date) add a branch to `storefront/checkout`'s UI logic → Mitigation: the branch condition (does this venue's catalog use dated offers) is exactly the same one `add-tenant-profile-offers`'s Ofertas tab already establishes, so no new detection logic is invented here.
