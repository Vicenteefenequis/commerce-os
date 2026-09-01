## Why

PRD §30 explicitly requires a "PWA/web scanner" in Access scope, and §9.4 (persona Operador de acesso) needs to "validar QR Code rapidamente" and "operar com baixa conectividade". QR validation only exists via API (`POST /access/scan`, M5) - without a UI, the door operator cannot grant or deny entry without someone calling the API directly, which fails the MVP's own final test (PRD §43).

## What Changes

- Add an authenticated admin screen at `apps/web/app/admin/scan`: select a Venue, scan (camera) or type a Ticket code, and see one of the six outcomes from the existing `POST /access/scan` (authorized / already used / invalid / wrong venue / wrong time / expired), then reset immediately for the next scan.
- Add "Scanner" to the admin nav.

## Capabilities

### New Capabilities

- `access/scanner`: the authenticated admin UI an access operator uses to scan/enter a Ticket code against a selected Venue and see the outcome.

## Impact

- Frontend: new `apps/web/app/admin/scan/` (page, content, scan Client Component leaf), added to `apps/web/middleware.ts`'s protected route matcher, following the existing admin conventions (`admin/data-fetching`, `admin/design-system`).
- No backend changes and no changes to `access/scan`'s behavior - the endpoint already fully specifies all six outcomes and enforces `entitlement:consume` server-side; this change is UI only.
- Independent of the storefront work (`add-storefront-catalog`, `add-storefront-checkout-ui`) - can be implemented in any order relative to those.
