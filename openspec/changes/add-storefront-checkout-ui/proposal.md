## Why

PRD §30 lists "seleção; dados do cliente; reserva temporária" as mandatory Checkout scope, and §9.6 (persona Consumidor) requires "utilizar o ticket sem instalar aplicativo" - a public, mobile-first, account-less screen. Today checkout only exists via API (`POST /checkout`, `GET/cancel /orders/:id`, M2). Without this screen, no real buyer can complete a purchase on their own - the platform cannot pass its own MVP test (PRD §43).

## What Changes

- Add a public storefront checkout UI at `apps/web/app/loja/[tenantId]/[venueId]`: browse products (via `add-storefront-catalog`'s public API) → select date/quantity → enter buyer email/name → order summary → `POST /checkout` → `POST /orders/:id/submit-for-payment` → redirect to the existing `/pay/[orderId]` payment page (unchanged - its own doc comment already scopes it to payment only and expects a flow like this in front of it).
- Failures (e.g. capacity exceeded, invalid buyer details) are shown without discarding the consumer's cart or entered details.

## Capabilities

### New Capabilities

- `storefront/checkout`: the public, account-less UI flow that turns storefront browsing into a paid Order, ending at the existing payment page.

## Impact

- Frontend: new public route group `apps/web/app/loja/[tenantId]/[venueId]/` (page + cart/buyer-details Client Component), consuming `add-storefront-catalog`'s public read endpoints and the existing `POST /checkout`, `POST /orders/:id/submit-for-payment` endpoints.
- No backend changes and no changes to `commerce/checkout`'s behavior - this change is UI only, in front of a capability that already exists and is fully specified.
- **Depends on `add-storefront-catalog` (M7)** - needs its public read endpoints to browse products before this UI has anything to render.
