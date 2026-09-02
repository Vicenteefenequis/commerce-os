## 1. Backend: QR generation

- [x] 1.1 Add the `qrcode` dependency to `apps/backend/package.json` and verify `npm install` succeeds and the package resolves
- [x] 1.2 Add a QR-rendering helper (code string -> PNG buffer) and verify a unit test decodes the generated image back to the original code

## 2. Backend: read Tickets by Order

- [x] 2.1 Add a repository query joining Ticket on Entitlement (`entitlementId`) filtered by Entitlement's `orderId` and `tenantId`, and verify a unit/integration test returns exactly the Tickets issued for a given Order
- [x] 2.2 Add `GET /orders/:orderId/tickets` (tenantId via query, no auth required, following the existing checkout/payments route pattern) returning each Ticket's id and code, and verify: paid order with tickets returns them; order from another tenant or nonexistent order returns an empty/not-found result; order not yet paid returns an empty list
- [x] 2.3 Add `GET /tickets/:ticketId/qrcode` (tenantId via query) returning the PNG QR image for that Ticket's code, and verify: correct tenantId+ticketId returns an image that decodes to the Ticket's code; wrong tenantId returns not-found

## 3. Backend: QR image in delivery email

- [x] 3.1 Update `deliver-order-tickets.usecase.ts` to render each ticket code's QR image and embed it in the email alongside the code, and verify a test asserts the email payload includes one QR image per ticket code
- [x] 3.2 Handle a per-ticket QR rendering failure by falling back to code-as-text for that ticket without failing the whole send, and verify a test where one of several tickets fails to render still results in a sent email with the other QR images plus that ticket's text code, and a delivery outcome that is not `failed` solely due to the rendering failure

## 4. Storefront: ticket view on /pay/[orderId]

- [x] 4.1 Add a server action/fetch to `apps/web/app/pay/[orderId]` calling `GET /orders/:orderId/tickets` once payment status is `succeeded`, and verify it returns the list of tickets for a succeeded order in a manual/integration check
- [x] 4.2 Replace the current static "Pagamento confirmado!" success view with a ticket viewer showing one Ticket's QR (`<img>` pointed at `GET /tickets/:ticketId/qrcode`) and code at a time, and verify visually that a single-ticket order renders the QR with no navigation controls
- [x] 4.3 Add previous/next navigation across an Order's Tickets, disabled at the first/last Ticket, and verify visually with a multi-quantity order that navigation moves between tickets and stops at both ends without wrapping

## 5. Verification

- [x] 5.1 Run backend and web test suites and verify both pass
- [x] 5.2 Manually run an end-to-end purchase (guest checkout -> pay -> succeeded) with quantity > 1 and confirm: the ticket view appears post-payment with correct navigation, the delivered email contains a QR per ticket, and each QR scans successfully in `/admin/scan`
