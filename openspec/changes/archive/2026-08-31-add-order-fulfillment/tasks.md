## 1. Payment success confirms held reservations

- [x] 1.1 In `ProcessStripeWebhookUseCase`, after transitioning the Order to `paid`, load the Order's lines and call `ConfirmReservationUseCase` for each line with a non-null `reservationId`; verify with a test asserting a `pending` Reservation backing a paid Order's line becomes `confirmed`.
- [x] 1.2 Verify an Order with no capacity-backed lines still transitions to `paid` with no Reservation calls attempted (existing behavior unchanged).
- [x] 1.3 Verify webhook idempotency still holds: redelivering the same `payment_intent.succeeded` event does not attempt to reconfirm an already-`confirmed` Reservation (the existing `tryClaim` guard short-circuits before this code runs).

## 2. Fulfill-order use case

- [x] 2.1 Add `fulfill-order.usecase.ts` in `commerce/application`: given a `paid` Order, load its lines, call `ConsumeReservationUseCase` for each line with a non-null `reservationId`, then transition the Order to `fulfilled` via `TransitionOrderStatusUseCase`; verify with a unit test.
- [x] 2.2 Reject fulfillment of an Order that is not `paid`, leaving its status unchanged; verify with a unit test per status (`draft`, `awaiting_payment`, `fulfilled`, `refunded`, `cancelled`, `expired`).
- [x] 2.3 Verify fulfilling an Order with a Reservation not in `confirmed` status surfaces an error rather than silently skipping it or partially fulfilling.
- [x] 2.4 Verify fulfilling an Order with no capacity-backed lines transitions it to `fulfilled` directly.

## 3. HTTP route and wiring

- [x] 3.1 Add `POST /orders/:id/fulfill` in `order.routes.ts`, gated by `requireAuth` + `requirePermission("order:manage")`, matching the `cancel` route's shape.
- [x] 3.2 Add `fulfillOrderController` in `order.controller.ts` wiring the use case to the route; verify with an integration test (route-level, using the existing `order-checkout.integration.test.ts` / `order-submit-for-payment.routes.test.ts` style).
- [x] 3.3 Verify a fulfillment attempt from a different tenant is rejected (RLS/tenant isolation), matching the pattern of existing cancel/refund tenant-isolation tests.

## 4. Audit trail

- [x] 4.1 Verify `TransitionOrderStatusUseCase`'s existing status-history recording captures the `paid -> fulfilled` transition with the acting identity (no new code expected here — confirm the existing mechanism covers it). **Deviation**: `FulfillOrderUseCase` follows `CancelOrderUseCase`'s pattern (direct `orders.transitionStatus` + `recordStatusHistory`, not `TransitionOrderStatusUseCase`), consistent with the existing cancellation code path.
- [x] 4.2 Verify the Reservation `confirmed -> consumed` transitions triggered by fulfillment are captured by `capacity/reservation`'s existing audit recording (no new code expected here — confirm the existing mechanism covers it). **Deviation**: the reservation-level audit trail already worked via the existing `RESERVATION_CONSUMED` consumer, but there was no consumer registered for the new `ORDER_FULFILLED` event, so the Order-level audit log entry required by commerce/fulfillment's "Fulfillment is recorded" would have been silently missing. Added an `ORDER_FULFILLED` consumer to `audit-outbox-consumer.ts`, mirroring the existing `ORDER_CANCELLED` one.
