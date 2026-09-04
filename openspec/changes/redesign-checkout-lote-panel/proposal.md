## Why

`storefront/checkout`'s cart step today is a flat variant list with one shared visit-date field and a fixed footer summary bar. The design's `W2`/`03`/`M` screens show a different interaction once `add-tenant-profile-offers` lets a consumer pick a specific dated offer: a panel scoped to *that one offer* — capacity bar, a lote (tier) picker, a quantity stepper, a price breakdown (subtotal, service fee, total), and a single "Reservar entrada" CTA — fixed to the side on desktop, a bottom sheet on mobile. This is the last step before payment handoff and the one most visually specified in the design; shipping it closes the gap between "offer selected" (previous change) and "redirected to payment" (existing, unchanged requirement).

## What Changes

- Add offer-scoped cart selection: when a consumer selects a dated offer (a Product with a fixed availability window, per `add-tenant-profile-offers`'s "offer" concept), the cart panel scopes to that offer's variants (lotes) alone, and the existing shared visit-date field is not shown — the offer's own date *is* the visit date. The existing shared-date flow is unchanged for venues whose products are not organized as dated offers (e.g. an evergreen day-pass ticket).
- Redesign the panel UI: capacity bar for the offer at the top, lote rows (`LoteRow`) with radio selection + remaining count + price, a quantity stepper for the selected lote, a price breakdown (line items, service fee, total), and a single primary CTA — fixed as a right-side panel on desktop (`W2`), a bottom sheet triggered from a sticky mini-bar on mobile (`M`).
- Keep the existing fixed-footer live-total behavior for the non-offer (shared-date) flow untouched.
- Out of scope: the payment page itself (unchanged); ticket/access screen after payment (`redesign-ticket-access-screen`); waitlist for a sold-out offer (`add-offer-waitlist`).

## Capabilities

### Modified Capabilities
- `storefront/checkout`: adds offer-scoped cart selection and its lote-picker/quantity/breakdown panel UI as an alternative path alongside the existing shared-visit-date flow; existing requirements for that shared-date flow are otherwise unchanged.

## Impact

- `apps/web/app/loja/[tenantSlug]/[venueSlug]` cart step gains the offer-scoped panel, composed from `LoteRow`/`CapacityBar` (`apply-ingressa-design-tokens`) and the offer selection state introduced by `add-tenant-profile-offers`'s Ofertas tab.
- No new backend endpoint: reuses the existing storefront availability lookup (`storefront/catalog`) and checkout submission (`commerce/checkout`) unchanged. Note: `commerce/checkout` has no service-fee concept today (it recalculates only variant price) — see design.md D2 for how the panel's price breakdown handles that gap without showing a fee the backend doesn't actually charge.
- Depends on `apply-ingressa-design-tokens` (components) and `add-tenant-profile-offers` (offer selection entry point).
