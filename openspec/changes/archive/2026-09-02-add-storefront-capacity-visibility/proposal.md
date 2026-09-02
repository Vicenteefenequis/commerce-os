## Why

Today the storefront cart only discovers that a capacity-bound ticket is sold out when checkout fails, after the consumer has already picked a date, chosen quantities, and entered their buyer details. `GET /storefront/variants/:tenantId/:variantId/availability` already exists (M7) and returns the same available-capacity figure checkout enforces, but the cart never calls it before submission. M12.2 (`storefront-date-first-selection`) put the visit date first in the flow, which is what makes it possible to look up availability for that date before the consumer commits to quantities.

## What Changes

- The storefront cart (`/loja/[tenantId]/[venueId]`) looks up availability for every capacity-bound variant (`resourceId` set) whenever the visit date changes, using the existing `GET /storefront/variants/:tenantId/:variantId/availability?period=<visitDate>` endpoint.
- Each capacity-bound variant's row shows the remaining capacity for the selected date (e.g. "8 vagas restantes").
- A variant with zero remaining capacity for the selected date is shown as sold out and its quantity input is disabled; a variant with an existing selected quantity that no longer fits (date changed to a date with less capacity) is flagged so the consumer can correct it before submitting.
- The quantity input for a capacity-bound variant cannot be raised past the variant's remaining capacity for the selected date.
- Variants with no bound resource are unaffected (no capacity lookup, no limit).

## Capabilities

### New Capabilities
(none)

### Modified Capabilities
- `storefront/checkout`: the cart must show remaining capacity per date for capacity-bound variants and prevent selecting more than what's available, instead of only failing at submission time.

## Impact

- `apps/web/app/loja/[tenantId]/[venueId]/checkout-cart.tsx`: fetch and display availability per variant, cap quantity inputs, show sold-out state.
- No backend changes: `GET /storefront/variants/:tenantId/:variantId/availability` (storefront/catalog) already provides what's needed.
