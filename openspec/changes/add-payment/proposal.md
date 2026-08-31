## Why

M2 (`commerce/order`, `commerce/checkout`) gives the platform an Order that can sit in `awaiting_payment`, but nothing drives it to `paid` — there is no way for a real customer to actually pay. The PRD's Fase 1 milestone ("primeiro R$1 processado") and MVP Definition of Done (§43, item 8: "aceitar pagamento real") both depend on this. `TransitionOrderStatusUseCase` and the `ORDER_TRANSITIONS` state machine already exist in `commerce/` specifically as the hook M3 calls into — this change is what calls it.

## What Changes

- Add a `Payment` entity tied 1:1 to an `Order`, with its own explicit lifecycle (`pending → succeeded/failed`, plus `refunded`/`partially_refunded`) and a financial audit trail independent of `order_status_history` (PAY-006).
- Add a Payment Provider abstraction (PAY-001) with Stripe as its first and only implementation — Stripe PaymentIntents for card, Stripe's Pix payment method for Pix (PAY-002).
- Add an idempotent webhook receiver (PAY-003) — the first inbound webhook endpoint in the system — that verifies Stripe's signature and processes each event exactly once via a persisted event-id ledger.
- Confirm payment only from the verified webhook event, never from the browser's post-payment redirect alone (PAY-004): the payment page polls/re-checks server-confirmed status rather than trusting its own redirect.
- Add refund support (PAY-005): admin-initiated (via the existing admin surface), calling Stripe's refund API and driving `Order.status` to `partially_refunded`/`refunded` through the existing `TransitionOrderStatusUseCase`.
- Add a minimal payment page in `apps/web` — given an existing `orderId` (created via the M2 checkout API), renders Stripe's Payment Element and shows the confirmed result. No cart, browsing, or checkout-form UI — that remains a future storefront change.
- Discovered while making the flow manually testable end to end: M2 never exposed a way to move an Order from `draft` to `awaiting_payment` over HTTP (only internal test code called `TransitionOrderStatusUseCase` directly). Add `POST /orders/:id/submit-for-payment`, account-less like the rest of checkout, so a real checkout can actually reach a payable state without direct DB access.

## Capabilities

### New Capabilities
- `payments/payment`: Payment entity and lifecycle, Payment Provider abstraction (Stripe), Pix + card support, idempotent webhook processing, refund, and financial audit trail (PAY-001 through PAY-006).

### Modified Capabilities
- `commerce/order`: no requirement text changes — `awaiting_payment → paid` and `paid → partially_refunded/refunded` transitions already exist in ORD-001; this change is a new caller of the existing `TransitionOrderStatusUseCase`, not a change to Order's own contract.
- `commerce/checkout`: adds the missing `draft → awaiting_payment` step as a public, account-less HTTP endpoint (`POST /orders/:id/submit-for-payment`) — closing the gap between "Order created" (M2) and "Order payable" (this change).

## Impact

- **Backend**: new `apps/backend/src/modules/payments/` module (domain/application/infrastructure) alongside `commerce/`; migration adding `payments` and `payment_events` tables, enrolled in tenant RLS like `orders`/`reservations`; new dependency on the Stripe SDK; new inbound route `POST /webhooks/stripe` (no auth — verified by Stripe signature instead) plus `POST /orders/:id/payment-intent` (or similar) and `POST /payments/:id/refund`.
- **Frontend**: new minimal route in `apps/web` (public, no storefront shell) for the payment page; Stripe.js/Payment Element as a new client dependency.
- **Depends on**: `commerce/order` + `commerce/checkout` (M2, already implemented) for the Order to attach payment to.
- **Blocks**: M4 (Entitlement + Ticket) — ticket issuance fires on `order.paid`, which this change is what produces for real.
