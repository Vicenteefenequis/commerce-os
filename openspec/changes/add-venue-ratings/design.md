## Context

Nothing in the current spec tree models reviews or ratings. The design only ever shows an aggregate number ("4,8 · 312 avaliações") — no review list, no review text, no per-reviewer identity — so this change is deliberately narrow: verified-purchase rating in, aggregate out, nothing else. See `openspec/specs/storefront/ticket-view`, `commerce/order`, `foundation/venue` for the adjacent capabilities this plugs into.

## Goals / Non-Goals

**Goals:**
- A Customer who genuinely bought at a Venue can rate it once per Order, account-less (consistent with the rest of the storefront's no-account model).
- A public, cheap-to-read aggregate (average + count) per Venue, shown on the profile.

**Non-Goals:**
- Displaying individual review text or a review list anywhere — not shown in the design, and doing it well requires moderation the business hasn't asked for.
- Editing or deleting a submitted rating.
- Owner responses to reviews.
- Weighting or fraud-detection on ratings beyond "one per Order" — sufficient for this change; revisit if gaming becomes an observed problem.

## Decisions

### D1: Rating eligibility is "has a paid Order at this Venue," verified by an order-scoped token, not login
Consistent with `ticketing/ticket`'s account-less listing pattern (order id + tenant id), the rating-submission endpoint accepts an Order id and the Venue's tenant id, checks the Order is `paid` (or a later, non-cancelled status) and belongs to that Venue, and rejects otherwise. No Customer login is introduced. The natural place to surface the "rate your visit" prompt is the ticket view or a follow-up link the buyer already has (their Order confirmation) — this change adds the prompt to the ticket view screen from `redesign-ticket-access-screen`, shown once the Order's tickets have been viewed, without gating on scan/attendance (the system has no reliable "did they actually show up" signal beyond the ticket being scanned, and gating on that is a further Non-Goal).

### D2: One rating per Order, not per Customer-Venue pair
A Customer could have multiple Orders (multiple visits) at the same Venue over time, and the design's use case ("rate your visit") is per-visit, not a single lifetime opinion. The uniqueness constraint is `(orderId)` — an Order can produce at most one rating — rather than `(customerId, venueId)`.

### D3: Aggregate is computed on read, not maintained as a running counter, for this change
Given ratings are expected to be low-volume relative to Orders, the aggregate (average, count) is computed with a straightforward query over the ratings table at read time rather than maintaining a denormalized running total on the Venue row. Revisit if this becomes a measured hot path.

## Risks / Trade-offs

- [Risk] No login and only Order-id-based verification means anyone who has (or guesses) a valid Order id + tenant id could submit a rating for that Order → Mitigation: Order ids are already treated as bearer-capability tokens elsewhere in this system (`ticketing/ticket`'s account-less listing uses the identical trust model); no new exposure is introduced beyond what already exists.
- [Risk] "Rate your visit" prompt fires on ticket-view access, not confirmed attendance → Mitigation: accepted for this change (matches D1's Non-Goal); a future change could gate it on `access/scan` consumption if rating quality becomes an issue.
