## 1. Data model & migration

- [x] 1.1 Add migration `payments`, `payment_events`, `payment_status_history` tables (see design.md - Migration Plan) and verify `npm run migrate` applies cleanly
- [x] 1.2 Enroll `payments`, `payment_events`, `payment_status_history` in tenant RLS the same way `orders`/`reservations` were, and verify a cross-tenant read/write is denied (spec: "Payment belongs to a single tenant")
- [x] 1.3 Add `Payment` domain entity (`payments/domain/payment.entity.ts`) with lifecycle `pending → succeeded/failed`, `succeeded → partially_refunded/refunded`, and verify unit tests cover valid/invalid transitions

## 2. Payment Provider abstraction

- [x] 2.1 Define `PaymentProviderPort` (create intent, retrieve status, refund) in `payments/domain/ports.ts`
- [x] 2.2 Implement `StripePaymentProvider` in `payments/infrastructure/` using the Stripe SDK, and verify it against Stripe's test-mode API for both a card PaymentIntent and a Pix payment method — verified live against Stripe's test-mode API: created a real PaymentIntent, confirmed it server-side with a Stripe test card, and the webhook (via `stripe listen`) drove Payment → `succeeded` and Order → `paid` automatically. Pix is not enabled on the platform's test account (see 7.2) - card is the only method actually exercised end to end.
- [x] 2.3 Add Stripe API key(s) to configuration/env handling following the existing config pattern, and verify the app boots with them present — keys are optional at the env layer (most of the app has nothing to do with payments); `StripePaymentProvider` itself throws if instantiated without them. App boots fine both with and without them set. Also fixed during manual testing: `config/env.ts` now loads the repo-root `.env` directly via `process.loadEnvFile` (existing `process.env` values still win) - `pnpm dev` via Turbo was silently stripping unlisted vars (strict env mode) before this, so `STRIPE_SECRET_KEY` never reached the backend even when `.env` was filled in. Verified with a clean `pnpm dev` (no manual env export) creating a real Stripe PaymentIntent.

## 3. Create payment & confirm via webhook

- [x] 3.0 Add `POST /orders/:id/submit-for-payment` (public, account-less like `POST /checkout` - design.md discovery), transitioning `draft → awaiting_payment` via `TransitionOrderStatusUseCase`; verify an integration test drives a `draft` Order to `awaiting_payment` and rejects a non-draft Order
- [x] 3.1 Add `CreatePaymentUseCase`: given an `orderId` in `awaiting_payment` with no active Payment, creates a `pending` Payment and a Stripe PaymentIntent; reject if the Order already has a `pending`/`succeeded` Payment (spec: "Duplicate active payment is rejected")
- [x] 3.2 Add `POST /orders/:id/payment-intent` route wiring the use case, and verify an integration test creates a Payment + PaymentIntent for a real `awaiting_payment` Order
- [x] 3.3 Add `POST /webhooks/stripe` route: verify Stripe-Signature header, reject invalid signatures with no state change (spec: "Webhook signature is verified")
- [x] 3.4 Add `ProcessStripeWebhookUseCase`: look up `provider_event_id` in `payment_events`; if present, no-op; otherwise apply the event's effect and record the event id, in one transaction (spec: "Duplicate webhook delivery is not double-processed")
- [x] 3.5 On a `payment_intent.succeeded` event, transition Payment to `succeeded` and call `TransitionOrderStatusUseCase` to move the Order to `paid`, attributed to the per-tenant system user, and verify an integration test drives an Order from `awaiting_payment` to `paid` via a simulated webhook
- [x] 3.6 On a `payment_intent.payment_failed` event, transition Payment to `failed` and verify the Order remains `awaiting_payment` (spec: "Second payment attempt after a failure")
- [x] 3.7 Verify (integration test) that Payment status never changes outside the webhook handler — no code path sets `succeeded` from an HTTP response to the client

## 4. Refund

- [x] 4.1 Add `RefundPaymentUseCase`: given a `succeeded` Payment and an amount (full or partial), calls the Payment Provider's refund, updates Payment status to `refunded`/`partially_refunded`, and calls `TransitionOrderStatusUseCase` accordingly
- [x] 4.2 Add `POST /payments/:id/refund` route gated by the same staff-authorization pattern as order cancellation, and verify an unauthorized/unauthenticated request is denied
- [x] 4.3 Verify integration tests cover both full refund (Order → `refunded`) and partial refund (Order → `partially_refunded`)

## 5. Financial audit trail

- [x] 5.1 Record a `payment_status_history` row on every Payment status change (success, failure, refund) with amount, resulting status, timestamp, and triggering actor/event, and verify unit tests cover each transition
- [x] 5.2 Verify (integration test) a refund produces both a `payment_status_history` entry and the existing `order_status_history` entry from `TransitionOrderStatusUseCase`

## 6. Payment page (apps/web)

- [x] 6.1 Add `GET /payments/:id/status` (public, no auth - design.md "Redirect vs. webhook" discovery) returning only `{ status }`, and verify an integration/route test confirms it requires no session and exposes nothing beyond status
- [x] 6.2 Add a minimal public route in `apps/web` that accepts an `orderId`, calls `POST /orders/:id/payment-intent`, and renders Stripe's Payment Element
- [x] 6.3 After Stripe's client-side confirmation (redirect or Payment Element callback), poll `GET /payments/:id/status` for server-confirmed status rather than trusting the redirect itself (spec: "Redirect without server-side confirmation does not confirm payment"), and show the confirmed result
- [x] 6.4 Manually verify end-to-end in Stripe test mode: create an Order via existing checkout API, open the payment page, pay with a Stripe test card, and confirm the Order reaches `paid` — done in the browser by the user: checkout → submit-for-payment → payment page → paid with Stripe test card `4242...` → "Pagamento confirmado!". Along the way found and fixed a real `stripe listen` misconfiguration (CLI was authenticated to a different Stripe account than `.env`'s key, so webhooks silently never arrived) and a Turbo strict-env-mode issue (`pnpm dev` was stripping the Stripe env vars from the backend process) - both were environment/tooling issues, not application bugs.

## 7. Verification

- [x] 7.1 Run full backend test suite and verify all `payments/` and `commerce/` tests pass
- [x] 7.2 Confirm Stripe Pix availability on the platform's actual Stripe account (design.md - Open Questions); if unavailable, verify card-only flow still satisfies PAY-002's minimum and note Pix as blocked on account setup — confirmed unavailable: creating a PaymentIntent with `payment_method_types: ["pix"]` on the platform's test account returns `payment_intent_invalid_parameter` ("type is invalid... ensure activated in your dashboard"). Card-only flow fully satisfies PAY-002's minimum (verified in 6.4). Pix needs to be activated in the Stripe Dashboard's payment settings before it can be used - no code change required once that's done, since `StripePaymentProvider` already requests it via `payment_method_types`.
