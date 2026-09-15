## 1. Data model

- [x] 1.1 Add a `channel` column to `Order` (`storefront` | `counter`), backfill all existing rows to `storefront` in the same migration, and verify the migration runs cleanly against a copy of the current schema with no null `channel` values remaining
- [x] 1.2 Add `cash` to the `Payment.method` enum and verify existing Pix/card Payment rows and code paths are unaffected (existing payment tests still pass)
- [x] 1.3 Add a per-Organization placeholder Customer lookup-or-create helper (`Cliente balcão`) and verify a unit test that calling it twice for the same Organization returns the same Customer id

## 2. Backend: counter sale

- [x] 2.1 Implement the counter-sale creation path (venue/product/lote/quantity, optional buyer) reusing checkout's price-recalculation and capacity/Reservation logic, and verify a unit/integration test creates an Order, Reservation (when applicable), `cash` Payment (`succeeded`), sets `channel: counter`, and transitions the Order to `paid` in one call
- [x] 2.2 Verify a test that a counter sale with no buyer info resolves to the Organization's placeholder Customer, and one with buyer info creates/resolves a real Customer
- [x] 2.3 Verify a test that a counter sale exceeding available capacity is rejected with no Order, Reservation, or Payment created
- [x] 2.4 Verify a test that Entitlements and Tickets are issued for a counter sale exactly as they are for a storefront Order (reusing the existing paid-transition trigger, no new issuance code path)
- [x] 2.5 Enforce that the counter-sale endpoint requires an authenticated admin session and verify a test that an unauthenticated request is denied

## 3. Backend: order channel filter and dashboard split

- [x] 3.1 Add `channel` as a filter option to the Orders list endpoint and verify a test combining it with an existing filter (status, customer)
- [x] 3.2 Extend the dashboard summary query to group GMV and order/ticket counts by `channel` and verify a test with Orders in both channels reports correct per-channel and combined figures
- [x] 3.3 Verify a test that a period with activity in only one channel reports zero for the other without affecting the populated channel's figures

## 4. Backend: ticket print view

- [x] 4.1 Implement a Ticket print endpoint/view reusing the existing tenant-isolated Ticket read and QR image rendering, and verify a test that a request for a Ticket outside the caller's Organization is denied
- [x] 4.2 Verify the print layout renders the QR code, code text, offer name, lote name, and buyer/placeholder name at 58mm and 80mm widths (manual check or snapshot test against both widths)

## 5. Frontend: admin counter-sale screen

- [x] 5.1 Build the counter-sale form (Venue -> Product -> lote -> quantity, optional buyer fields) as a Server Component + Server Action mutation per `admin/data-fetching` conventions, and verify submitting a valid sale redirects to a confirmation/print step
- [x] 5.2 Surface capacity and price-recalculation feedback (e.g. rejected due to capacity) in the form, and verify a manual test of the insufficient-capacity path shows a clear error without a stack trace
- [x] 5.3 Add a "Imprimir ticket" action from the confirmation step that opens the print view for each issued Ticket, and verify a manual browser test that Ctrl+P produces a legible receipt-width layout

## 6. Frontend: dashboard channel breakdown

- [x] 6.1 Add the platform/manual GMV and count breakdown to the dashboard summary UI alongside existing totals, and verify a manual test with seeded Orders in both channels shows correct split figures
- [x] 6.2 Add `channel` as a filter control on the Orders list screen and verify a manual test that filtering by `counter` shows only counter-sale Orders

## 7. End-to-end verification

- [x] 7.1 Run a full manual walkthrough: create a counter sale with no buyer info, confirm it appears in the dashboard's manual channel, print its ticket, and scan it via the existing `access/scanner` screen to confirm it authorizes entry
- [x] 7.2 Run `openspec validate add-counter-ticket-sales --strict` and confirm it passes before archiving
