## Why

The Golden Path Tenants design shows a rating stat ("4,8 · 312 avaliações") on the tenant profile (`02`/`W2`) and reserves an Avaliações tab that `add-tenant-profile-offers` deliberately left unimplemented (that change ships only Ofertas/Sobre/Localização, per its own design.md D2). No rating or review capability exists anywhere in the system today — this is genuinely new domain scope, not an extension. The design itself only ever shows an *aggregate* rating (average + count), never individual review text or a review list, so this change scopes to exactly that: let a genuine buyer rate their visit, and show the aggregate publicly.

## What Changes

- New `storefront/reviews` capability: a Customer who has a `paid` (or later) Order at a Venue can submit a 1-5 star rating for that Venue, once per Order, optionally with a short text comment.
- Public, account-less read of a Venue's aggregate rating (average, rounded to one decimal, and total count) — the number shown on the tenant profile and, per `expand-storefront-discovery-grid`, potentially on discovery cards in a later iteration (not this change — see Impact).
- Add the Avaliações tab (deferred by `add-tenant-profile-offers`) to the tenant profile, showing the aggregate stat; individual review text/listing UI is out of scope (the design never shows one, and moderation of public review text is a separate, larger scope).
- Out of scope: review moderation/reporting, owner responses to reviews, editing/deleting a submitted rating, and showing individual review text anywhere in the UI.

## Capabilities

### New Capabilities
- `storefront/reviews`: lets a verified buyer (one with a paid Order at the Venue) submit a one-time 1-5 star rating per Order, and exposes the Venue's aggregate rating publicly and account-less.

### Modified Capabilities
- `storefront/showcase`: tenant profile gains the fourth (Avaliações) tab showing the aggregate rating stat, completing the tab set `add-tenant-profile-offers` reserved.

## Impact

- New backend table/model for Venue ratings (`venueId`, `orderId` unique-per-pair, `stars` 1-5, optional `comment`, `createdAt`).
- New public read endpoint for a Venue's aggregate rating; new authenticated-by-order-ownership write endpoint for submitting a rating (no account required — same account-less pattern as `ticketing/ticket`'s order-scoped listing).
- `apps/web` gains the Avaliações tab (stat only) on the tenant profile, and a "rate your visit" prompt surfaced from the ticket view or a post-visit link (see design.md for where this prompt is triggered).
- Depends on `add-tenant-profile-offers` for the tab-bar structure it extends.
