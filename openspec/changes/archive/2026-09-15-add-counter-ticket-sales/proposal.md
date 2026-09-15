## Why

Not every visitor buys through the storefront. A pilot establishment needs to sell a ticket at its own physical counter — to a walk-in who never touched the platform — and hand that person a physical, scannable proof of entry. Today the admin dashboard has no way to create an Order at all; every Order originates from the unauthenticated storefront checkout, and there is no printable ticket format for a staff member to hand over. The dashboard also cannot tell an owner how much of their business came from the platform versus the counter, which they need to know now that both exist.

## What Changes

- Add a counter-sale screen in the admin dashboard: an authenticated staff member picks a Venue, Product, and lote (variant), sets a quantity, and completes the sale on behalf of a walk-in customer who did not buy through the storefront. Buyer identification is optional — an unnamed walk-in defaults to a generic "Cliente balcão" placeholder Customer rather than being rejected.
- Add `cash` as a supported Payment method. A counter sale's Payment is created already `succeeded`, recorded as caused by the acting staff member's action rather than a Payment Provider webhook, following the same audit trail as any other Payment status change.
- Add a printable ticket layout sized for a thermal receipt printer (58/80mm), so the Ticket issued from a counter sale can be printed on the spot and handed to the visitor for door validation, reusing the existing Ticket/QR issuance unchanged.
- Add a sales channel split to the dashboard summary: GMV and order/ticket counts broken out by `platform` (storefront) versus `manual` (counter) origin, alongside the existing totals.
- Any authenticated admin session for the Organization can record a counter sale — no new granular permission is introduced; this reuses the same session-based authorization every other admin screen relies on.
- Out of scope: charging a customer by Pix or card from the counter-sale screen (cash only for this change); a POS/hardware integration beyond a receipt-printer-shaped page; refunding a counter sale (existing Payment refund flow applies, but is not changed here).

## Capabilities

### New Capabilities
- `admin/counter-sale`: lets an authenticated staff member create a paid Order directly from the admin dashboard for a walk-in customer, with optional buyer identity, reusing existing capacity/Reservation and Entitlement/Ticket issuance.
- `ticketing/ticket-print`: a printable, thermal-receipt-sized rendering of an issued Ticket's QR code and display context, for handing a physical proof of entry to a visitor.

### Modified Capabilities
- `commerce/order`: an Order records which channel created it (`storefront` or `counter`), so downstream reporting can distinguish the two without inferring it from Payment method.
- `payments/payment`: adds `cash` to the set of supported payment methods, created directly as `succeeded` by an authorized admin action instead of confirmed by a Payment Provider webhook.
- `admin/dashboard`: the summary additionally reports GMV and order/ticket counts split by sales channel (`platform` vs `manual`), alongside the existing tenant/venue/period-scoped totals.

## Impact

- `apps/web` admin: new counter-sale screen and a print view for a counter-issued Ticket; dashboard summary UI gains a channel breakdown.
- Backend: new endpoint(s) to create a counter Order (server-recalculated price, capacity check, optional buyer, immediate `cash` Payment and `paid` transition) and to render a Ticket's print layout; `Order` gains a channel field; dashboard summary aggregation groups by that field.
- Reuses unchanged: `capacity/reservation` holding, `ticketing/entitlement` and `ticketing/ticket` issuance, `access/scan` validation, `communication/ticket-delivery` (a counter sale's walk-in placeholder customer has no real email, so delivery will record `not_configured`/skip rather than send — no change needed there).
