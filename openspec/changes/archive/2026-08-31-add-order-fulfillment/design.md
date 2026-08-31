## Context

See proposal.md - Why. `commerce/order` already lists `fulfilled` as a status and `order-transitions.ts` already allows `paid -> fulfilled`; nothing exercises it. `capacity/reservation` already has the primitives this needs (`ConfirmReservationUseCase`, `ConsumeReservationUseCase`) — this change only wires them into the Order/Payment lifecycle, following the precedent already set by `create-order.usecase.ts`, which imports `capacity`'s `CreateReservationUseCase` directly rather than going through an event or port abstraction.

## Goals / Non-Goals

**Goals:**
- Drive `pending -> confirmed` on an Order's Reservations at the moment payment succeeds.
- Add a `fulfill` action that drives `confirmed -> consumed` on those Reservations and `paid -> fulfilled` on the Order.
- Keep the same actor-attribution and audit patterns already used by `cancel-order.usecase.ts` and `refund-payment.usecase.ts`.

**Non-Goals:**
- No admin UI for triggering fulfillment (tracked as a separate change).
- No partial fulfillment (fulfilling only some lines of an Order) — out of scope; an Order is fulfilled as a whole.
- No automatic/scheduled fulfillment (e.g. auto-fulfilling after a venue date passes) — this is an explicit staff action for now.

## Decisions

**Reservation confirmation lives in the payment webhook path, not in a new event listener.**
`ProcessStripeWebhookUseCase` already calls `TransitionOrderStatusUseCase` synchronously in the same transaction when a payment succeeds. Confirming the Order's Reservations right after that transition keeps the "payment succeeded" outcome atomic (one webhook delivery either fully applies its effects or, via the existing idempotent-claim check, not at all) and avoids introducing an event-driven side-effect path where none exists yet in this codebase. Alternative considered: publish `paymentSucceededEvent` and have a `capacity` listener confirm reservations — rejected because there's no existing event-subscription infrastructure to hook into, and it would make a single logical operation ("payment succeeded") span two separately-committed steps.

**Fulfillment is a new `fulfill-order.usecase.ts` in `commerce`, calling into `capacity` directly.**
Mirrors `create-order.usecase.ts`, which already imports `capacity` application use cases and ports directly. Alternative considered: expose a `capacity` port for "consume all reservations for an order" — rejected as unnecessary indirection for a call pattern the codebase already makes directly.

**Reservations without a matching Order line concept stay untouched; an Order with zero Reservations fulfills trivially.**
`OrderLine.reservationId` is already nullable for lines whose variant has no `resourceId` (spec: commerce/order - "Order line for a variant without a resource holds no capacity"). Fulfillment simply skips lines with no `reservationId`.

**New route `POST /orders/:id/fulfill`, gated by the existing `order:manage` permission.**
Matches `POST /orders/:id/cancel`, which uses the same permission for a similar staff-only Order-lifecycle action. No new permission is introduced.

## Risks / Trade-offs

- **A Reservation already `confirmed` by some future path (not introduced by this change) before payment succeeds would make the new confirm step a no-op transition attempt.** Mitigation: `ConfirmReservationUseCase` already targets the `pending -> confirmed` transition specifically and is idempotent-safe to call only once per Order in the webhook path; this change does not call it elsewhere.
- **Fulfilling an Order with a Reservation stuck in `pending`** (e.g. payment succeeded but reservation confirmation somehow didn't run) **would fail the whole fulfillment.** This is treated as an error to surface, not silently skip, since it would otherwise hide a data-integrity problem — consistent with how `ConsumeReservationUseCase` already rejects a non-`confirmed` Reservation.

## Migration Plan

Additive only: a new usecase, a new route, and one new side effect inside an existing webhook path. No schema changes (Order and Reservation status enums already include the relevant values). No rollback beyond reverting the change, since no previously-working transition is altered — only the previously-dead `paid -> fulfilled` edge and the previously-unused `pending -> confirmed` step on payment success are exercised for the first time.
