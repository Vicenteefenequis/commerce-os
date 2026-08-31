## Why

An Order's lifecycle already defines `fulfilled` as a valid status (`commerce/order`), and the state machine in `order-transitions.ts` already allows `paid -> fulfilled`, but nothing ever drives that transition. A `paid` Order for a capacity-backed line (a venue booking, a guided tour slot) also leaves its Reservation `pending` forever — payment never confirms it, and nothing ever consumes it. Without this, every paid Order sits open indefinitely: staff have no way to record that a customer redeemed what they bought, and capacity that was actually used is never marked as permanently consumed. This is the missing step between "customer paid" and "order is done," and it blocks the MVP from being usable end to end for a real booking.

## What Changes

- On successful payment (Order `awaiting_payment -> paid`), confirm every `pending` Reservation backing the Order's lines (`pending -> confirmed`), so held capacity becomes committed rather than still-cancelable.
- Add a fulfillment action that an authorized actor can trigger on a `paid` Order: it consumes every `confirmed` Reservation backing the Order's lines (`confirmed -> consumed`) and transitions the Order to `fulfilled`.
- An Order with no capacity-backed lines (no Reservations at all) can still be fulfilled directly.
- Every transition is recorded in the Order's status history and the audit log, consistent with existing lifecycle recording.

## Capabilities

### New Capabilities
- `commerce/fulfillment`: marking a `paid` Order as `fulfilled`, consuming the Reservations that back its lines.

### Modified Capabilities
- `payments/payment`: "Successful payment transitions the Order to paid" gains a side effect — confirming the Order's pending Reservations — so capacity moves from held to committed at the moment of payment rather than staying pending indefinitely.

## Impact

- `apps/backend/src/modules/commerce`: new `fulfill-order.usecase.ts`, new route `POST /orders/:id/fulfill` (gated by `order:manage`, matching the existing cancel route).
- `apps/backend/src/modules/payments`: `process-stripe-webhook.usecase.ts` (or the paid-transition path it calls) gains a call to confirm the Order's Reservations.
- `apps/backend/src/modules/capacity`: no new primitives — reuses existing `confirm-reservation` and `consume-reservation` usecases, invoked from commerce/payments orchestration instead of directly by staff.
- No admin UI included in this change (tracked separately) — this is the backend lifecycle only.
