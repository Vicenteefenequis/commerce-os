## 1. Backend: waitlist entries

- [ ] 1.1 Add a waitlist table/model (`productId`, `email`, `joinedAt`, `notifiedAt` nullable) with a migration and a unique constraint enforcing D4's "one un-notified entry per (offer, email)" rule
- [ ] 1.2 Implement the join endpoint: reject when the offer currently has available capacity, otherwise insert (or no-op on an existing un-notified duplicate) (spec: storefront/waitlist - Joining a waitlist requires only an email / At most one active entry per offer and email / Rejoining after being notified creates a new entry)

## 2. Backend: notification trigger

- [ ] 2.1 Add the "capacity newly available" check (design.md D1) to the commitment-release path in `capacity/resource`, and to the capacity-override-increase path, comparing before/after available capacity for the affected Resource/period
- [ ] 2.2 When capacity moves from zero to positive, look up the offer(s) whose resource-backed variants reference that Resource/period, and notify their un-notified waitlist entries in join order, capped by the newly available unit count (spec: storefront/waitlist - Newly available capacity notifies waitlisted entries in join order)
- [ ] 2.3 Reuse `communication/ticket-delivery`'s email-provider abstraction for sending the notification, recording `sent`/`failed`/`not_configured` the same way, and mark `notifiedAt` regardless of delivery outcome (spec: storefront/waitlist - Notification uses the existing swappable delivery mechanism)
- [ ] 2.4 Verify a notified entry is never selected again by the notification query, even after a later zero-to-positive transition for the same offer (spec: storefront/waitlist - A notified entry is never re-notified)
- [ ] 2.5 Verify notification scoping never crosses offers or Organizations (spec: storefront/waitlist - Waitlist entries are isolated by tenant)

## 3. Frontend

- [ ] 3.1 Add the waitlist join affordance to a sold-out `OfferRow` in the Ofertas tab (email input + submit), shown only when the offer has zero remaining capacity (spec: storefront/showcase - Sold-out offer shows a waitlist join affordance)
- [ ] 3.2 Verify the affordance is absent once the offer has any remaining capacity, and that a successful join shows a clear confirmation state

## 4. Verification

- [ ] 4.1 Manually verify: joining a sold-out offer's waitlist, then releasing a held commitment for that offer's resource, results in a notification attempt for the earliest joiner(s) up to the freed unit count
- [ ] 4.2 Manually verify a duplicate join before notification is a no-op, and a join after notification creates a fresh entry
- [ ] 4.3 Run `pnpm --filter web lint`, `pnpm --filter web build`, and the backend test suite, and verify all succeed
