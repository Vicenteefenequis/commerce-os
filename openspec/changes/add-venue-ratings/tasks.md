## 1. Backend

- [ ] 1.1 Add a ratings table/model (`venueId`, `orderId` unique, `stars` 1-5, optional `comment`, `createdAt`) with a migration
- [ ] 1.2 Implement the rating-submission endpoint: validate Order id + tenant id match, Order status is `paid` or later and not cancelled, star value in range, and reject a second submission for the same Order (spec: storefront/reviews - Rating submission requires a paid order at the venue / At most one rating per order / Star value out of range is rejected)
- [ ] 1.3 Implement the public aggregate-read endpoint (average rounded to one decimal, count), identified by venue slug, returning "no aggregate" for zero ratings rather than a zero average (spec: storefront/reviews - Venue aggregate rating is public and account-less)
- [ ] 1.4 Verify no endpoint exposes an individual rating's stars or comment (spec: storefront/reviews - Rating may include an optional comment, not publicly displayed)
- [ ] 1.5 Verify tenant isolation: a rating recorded for Organization A's Venue never appears in Organization B's aggregate read

## 2. Frontend

- [ ] 2.1 Add the Avaliações tab to the tenant profile tab bar, shown only when the Venue has at least one recorded rating (spec: storefront/showcase - Avaliações tab shows the venue's aggregate rating)
- [ ] 2.2 Show the average + count stat tile (promoted from stub) on the profile header once ratings exist
- [ ] 2.3 Add a "rate your visit" prompt to the ticket view screen (`redesign-ticket-access-screen`), submitting a 1-5 star rating (with optional comment) against the current Order, shown once per Order
- [ ] 2.4 Verify the prompt does not appear again after a rating has already been submitted for that Order

## 3. Verification

- [ ] 3.1 Manually verify: submitting a rating for a paid order succeeds once and is rejected on retry; submitting for an unpaid or cancelled order is rejected
- [ ] 3.2 Manually verify the Avaliações tab is absent for a venue with zero ratings and present with the correct average/count once at least one exists
- [ ] 3.3 Run `pnpm --filter web lint`, `pnpm --filter web build`, and the backend test suite, and verify all succeed
