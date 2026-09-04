## Why

The design's tenant profile (screen `02`) shows a sold-out offer with an explicit "LISTA DE ESPERA ABERTA" (waitlist open) state, distinct from simply hiding or graying out a sold-out row. Nothing in the current spec tree lets a consumer register interest in a sold-out offer or get notified if a spot frees up — today a sold-out offer is a dead end. This is new domain scope (no existing capability models "interest in something not currently available"), following `add-venue-ratings`'s pattern of being a narrowly-scoped new capability rather than an extension.

## What Changes

- New `storefront/waitlist` capability: an account-less consumer can join a waitlist for a specific sold-out offer (Product) with just an email, at most once per offer.
- When a resource-backed offer's available capacity rises from zero to a positive number, the system notifies waitlisted entries by email, in join order, up to the number of newly available units, using the same swappable-provider delivery pattern as `communication/ticket-delivery` (outcome recorded; failure doesn't block anything else).
- A notified entry is not re-notified even if capacity later returns to zero and frees again — the notification is a one-time "it's available, go buy it" nudge, not a reservation or guarantee.
- UI: the design's "ESGOTADO · LISTA DE ESPERA ABERTA" state on a sold-out `OfferRow`, opening a one-field (email) join form.
- Out of scope: reserving capacity for a notified waitlist entry (first-come-first-served at checkout still applies, same as any other consumer); SMS/push notification channels; a consumer-facing "my waitlists" view.

## Capabilities

### New Capabilities
- `storefront/waitlist`: lets a consumer register an email against a sold-out offer and be notified, once, when capacity for it becomes available again.

### Modified Capabilities
- `storefront/showcase`: a sold-out offer in the Ofertas tab shows a waitlist join affordance instead of only a disabled/sold-out state.

## Impact

- New backend table/model for waitlist entries (`productId`, `email`, `joinedAt`, `notifiedAt` nullable).
- A hook on `capacity/resource`'s availability-increasing paths (release of a `held` commitment, or a capacity override increase) that checks for newly-available capacity and triggers waitlist notification for the affected Resource/period.
- Reuses the existing email-provider abstraction from `communication/ticket-delivery` rather than introducing a second one.
- `apps/web`'s Ofertas tab (`add-tenant-profile-offers`) gains the waitlist join affordance on sold-out `OfferRow`s.
- Depends on `add-tenant-profile-offers` for the Ofertas tab this plugs into.
