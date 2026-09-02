## Why

Today the storefront cart (`apps/web/app/loja/[tenantId]/[venueId]/checkout-cart.tsx`) only shows a "Data da visita" field for a capacity-bound variant after the buyer has already set its quantity above zero, and each such variant carries its own independent date field. For a multi-variant product (e.g. "Meia"/"Inteira" for the same event) this lets a buyer pick two different visit dates in the same cart for tickets that are meant to be used together, and it hides the most important decision — "which day am I going?" — behind the ticket-quantity step instead of in front of it. Roadmap M12.2 calls for making the visit date a single, cart-level choice made *before* the buyer picks tickets, matching how date-first booking flows normally work.

## What Changes

- The storefront cart gets a single visit-date field, shown above the ticket/product list, instead of a per-line date field shown only once a capacity-bound line has a quantity.
- Only one visit date exists per cart: it applies to every capacity-bound line the buyer adds (`variant.resourceId` set); products/variants with no `resourceId` are unaffected (no date required, as today).
- The date defaults to today, exactly as the current per-line field does, and remains editable at any time before checkout (changing it does not clear already-selected quantities).
- **BREAKING** (pre-launch, no shipped caller): `submitCheckout`'s `SubmitCheckoutInput` drops the per-line `period` in favor of a single cart-level `period` sent for every capacity-bound line; `POST /checkout`'s request contract from the storefront is unchanged (it still receives one `period` string per line — the frontend now just fills it from the shared cart date instead of a per-line field).
- Client-side validation moves from "does this line have a date" to "is the cart-level date set" (it always is, since it defaults to today) — the existing "no items selected" and "missing name/email" validations are unchanged.

Out of scope: per-date availability/capacity display (M12.3), multiple visit dates in one cart, and any backend schema or `POST /checkout` API change.

## Capabilities

### Modified Capabilities
- `storefront/checkout`: the buyer now sets one visit date for the whole cart before selecting ticket quantities, instead of a date per capacity-bound line chosen after quantity.

## Impact

- **Frontend only**: `apps/web/app/loja/[tenantId]/[venueId]/checkout-cart.tsx` (cart-level date state, UI reorder — date field above the product list, remove per-line date inputs), `apps/web/app/loja/[tenantId]/[venueId]/actions.ts` (`SubmitCheckoutInput`/`CheckoutLineInput` still send one `period` per line to `POST /checkout`, now all sourced from the single cart date).
- No backend, database, or API contract changes.
