## Why

A paid Order already issues Entitlements and Tickets, and `communication/ticket-delivery` already emails the Customer, but the email lists each Ticket's code as plain text and no screen ever renders it as a scannable QR image. The Customer has no way to present a QR at the door, and the door's own `access/scan` UI (camera + manual entry) has nothing visual to scan against for a code delivered as text.

## What Changes

- Add a QR image representation of a Ticket's code, generated server-side (the existing `access/scan` decoder already expects a scannable image, not a typed code).
- Add an account-less read path that lets the purchasing Customer retrieve their paid Order's Tickets (following the same tenantId+resourceId-in-request pattern already used by `commerce/checkout`, `payments`, and `storefront`; no new signed-token scheme).
- Extend the `/pay/[orderId]` storefront page: once payment is `succeeded`, it fetches the Order's Tickets and displays them one at a time (QR image + code), with previous/next navigation across multiple Tickets on the same Order.
- Extend `communication/ticket-delivery`'s email to embed each Ticket's QR image alongside its code, instead of the code alone.
- No persistent recovery link is introduced in this change — access to the QR is limited to the immediate post-payment screen and the delivered email.

## Capabilities

### New Capabilities
- `storefront/ticket-view`: gives an account-less consumer, right after their Order's payment succeeds, a screen to view each purchased Ticket's QR code one at a time, with navigation between Tickets when the Order holds more than one.

### Modified Capabilities
- `ticketing/ticket`: add the ability to retrieve a Ticket's code as a rendered QR image, and to list the Tickets belonging to a paid Order for account-less, tenant-scoped read access (the data backing both the storefront screen and the email).
- `communication/ticket-delivery`: the ticket email SHALL include each Ticket's QR image, not only its code as plain text.

## Impact

- **apps/backend**: new query joining Ticket ↔ Entitlement ↔ Order (no existing route returns Tickets by Order today); new account-less HTTP route(s) to list an Order's Tickets and to render a Ticket's QR image; a new QR-generation dependency (e.g. `qrcode`) added to `apps/backend/package.json`; `deliver-order-tickets.usecase.ts` updated to embed QR images in the email body.
- **apps/web**: `/pay/[orderId]/pay-form.tsx` and its server actions extended to fetch and display the Order's Tickets with QR + navigation once payment succeeds.
- **communication module**: email body changes from plain-text codes to code + QR image per Ticket.
- No changes to `ticketing/entitlement`, `access/scan`, or `access/scanner` — the scan flow keeps decoding whatever code the QR encodes, unchanged.
