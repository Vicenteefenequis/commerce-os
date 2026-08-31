## Context

`commerce/order` and `commerce/checkout` (M2) produce an Order in `awaiting_payment` with no payment attached. `ORDER_TRANSITIONS` already allows `awaiting_payment → paid → {partially_refunded, refunded}` and `TransitionOrderStatusUseCase` already records history and publishes `orderStatusChangedEvent` — both exist unused today specifically for M3 to call. See proposal.md - Why.

Confirmed with the user: Stripe is the Payment Provider (card via PaymentIntents, Pix via Stripe's Pix payment method), and this change includes only a minimal payment page in `apps/web` (renders Stripe's Payment Element for an existing `orderId`) — no cart/browsing/checkout-form UI, that stays a future storefront change.

There is no inbound webhook receiver anywhere in the codebase today — every existing module is called synchronously by an authenticated caller or by `EventPublisherPort` in-process. This change introduces the first one.

## Goals / Non-Goals

**Goals:**
- Let a real customer pay a real Order via Stripe (Pix or card) and have that reliably drive `Order.status` to `paid`.
- Make payment confirmation depend only on a verified, idempotently-processed Stripe webhook — never on the client's redirect.
- Give the platform an auditable financial trail (Payment lifecycle + amounts) independent of `order_status_history`.
- Support refund, admin-initiated, reflected on both Payment and Order.

**Non-Goals:**
- No storefront cart/browsing/checkout-form UI — the payment page assumes an `orderId` already exists (created via M2's `POST /checkout`).
- No customer-initiated refund flow — refund is an admin action only, matching how order cancellation already works.
- No support for a second concurrent Payment Provider — the abstraction exists (PAY-001) but only Stripe implements it; no config UI to choose a provider.
- No reconciliation/settlement reporting (PRD's `payments/reconciliation.md` is not part of M3's PAY-001..006 scope).
- No retry/dunning policy for failed payments — a failed Payment simply lets the customer create a new one (see spec: "Second payment attempt after a failure").

## Decisions

### Payment Provider abstraction: a narrow port, Stripe as sole adapter
A `PaymentProviderPort` (create intent, retrieve status, refund) lives in `payments/domain/ports.ts`, mirroring `OrderRepositoryPort`'s shape. `StripePaymentProvider` in `payments/infrastructure/` is the only implementation. No factory/registry for multiple providers — YAGNI until a second provider is actually needed, consistent with M2's anti-over-engineering precedent (variant→resource link).

Alternatives considered:
- **Stripe Checkout (hosted redirect)** — rejected per user's explicit choice of an embedded Payment Element page, for brand/UX control.
- **Generic multi-provider abstraction from day one** — rejected; nothing today needs a second provider, and the port already isolates the domain from Stripe's shape without pre-building unused branching.

### Payment lifecycle: separate entity, not extra Order states
`Payment` is its own entity/table (`pending → succeeded/failed`, `→ partially_refunded/refunded`), not additional Order states, because an Order can have multiple Payment attempts (a failed one followed by a retry) while only ever having one current status. This mirrors how `commerce/order` already separates itself from `capacity/reservation` — one Order can reference a Reservation, not collapse into it.

### Webhook idempotency: persisted Stripe event-id ledger
A `payment_events` table stores every processed Stripe event id. On receipt, the handler verifies the Stripe-Signature header, checks whether the event id is already recorded, and if not: applies the effect (transition Payment/Order, record audit) and inserts the event id in the same transaction. A duplicate delivery finds its event id already present and no-ops. This is the same idempotency shape as checkout's dedup key (M2, CHK-005) applied to an inbound event instead of an inbound request.

Alternatives considered:
- **Rely on Stripe's own idempotency keys for outbound calls only** — insufficient; that guards duplicate *requests we send*, not duplicate *webhook deliveries we receive*, which Stripe explicitly does not dedupe for the receiver.
- **Dedupe on (Payment id, target status) instead of event id** — rejected: collapses genuinely distinct events (e.g., a partial refund followed by a second partial refund) into the same key.

### Redirect vs. webhook: payment page polls server state, webhook is the only writer
The payment page never sets Payment/Order status itself. After Stripe confirms client-side (redirect or Payment Element callback), the page polls a new `GET /payments/:id/status` endpoint for the server-confirmed status; the actual `succeeded` transition only ever happens inside the webhook handler. Satisfies PAY-004 directly.

Discovered during implementation, not anticipated when this decision was first written: the existing M2 `GET /orders/:id` is staff-gated (`requireAuth` + `requirePermission("order:manage")`), so a guest customer's payment page cannot call it. Confirmed with the user: rather than exposing Order details publicly, `GET /payments/:id/status` is a new, unauthenticated, status-only endpoint (Payment id + tenantId, no session) that returns just `{ status }` - a Payment's `succeeded` status is a reliable proxy for its Order having reached `paid`, since both transition in the same DB transaction (`ProcessStripeWebhookUseCase`). This keeps the exposed surface narrower than reading the full Order, and stays inside `payments/`'s own capability (spec: "Payment status can be checked without an authenticated session") rather than changing `commerce/order`'s tenant-isolation contract.

Alternatives considered:
- **A possession token returned alongside the PaymentIntent, required to poll status** — more resistant to Payment-id guessing, but adds token issuance/validation scope not otherwise needed by this change; rejected per user's explicit choice for the simpler status-only endpoint, consistent with the trust level `POST /checkout` and `POST /orders/:id/payment-intent` already accept (knowing the id is enough).

### Refund: admin-initiated, reuses `TransitionOrderStatusUseCase`
`POST /payments/:id/refund` (full or partial amount) is gated the same way order cancellation is — an authorized staff identity, not a public endpoint. It calls Stripe's refund API synchronously, then updates Payment status and calls `TransitionOrderStatusUseCase` to move the Order to `partially_refunded`/`refunded`, reusing the existing history-recording and event-publishing path instead of duplicating it in `payments/`.

### Closing the draft → awaiting_payment gap: a public submit endpoint, not staff-gated
Discovered while making the flow manually testable end to end (not anticipated when this design was first written): M2's `POST /checkout` creates an Order in `draft` and nothing ever moves it to `awaiting_payment` over HTTP. Confirmed with the user: add `POST /orders/:id/submit-for-payment`, account-less like `POST /checkout` and `POST /orders/:id/payment-intent` (tenantId from an authenticated identity when present, else the request body) - not staff-gated (`requireAuth`/`requirePermission`) like the internal `GET/cancel /orders/:id` routes, because gating it to staff would break CHK-001's account-less design for the one step that actually makes an Order payable. It calls the existing `TransitionOrderStatusUseCase` (`draft → awaiting_payment`), guarded the same way every other transition already is - no new state-machine logic.

### Guest payment audit attribution: reuse M2's system user
Like guest checkout (M2), a webhook-driven payment success has no authenticated identity. It reuses the per-tenant system user (`checkout-system@internal.local`, `infrastructure/system-user.kysely.ts`) already built for this exact problem — no new mechanism.

## Risks / Trade-offs

- **[Risk]** Stripe webhook delivery could be delayed or lost, leaving an Order stuck in `awaiting_payment` despite a successful charge → **Mitigation**: out of scope for this change to build reconciliation tooling; flagged here rather than silently ignored — a manual "check Stripe, mark paid" admin action is the fallback until reconciliation (PRD's post-MVP scope) exists.
- **[Risk]** Discovered during manual testing, not anticipated when this design was first written: `pnpm dev` (via Turbo, which defaults to strict env mode) silently stripped `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET` from the backend's process environment even with a correctly filled-in `.env` sourced in the parent shell - the first required env var this codebase has added with no fallback default, so the gap went unnoticed until now → **Mitigation**: `config/env.ts` now loads the repo-root `.env` directly via `process.loadEnvFile`, independent of whatever launched the process (Turbo, a plain shell, `tsx watch` directly). Existing `process.env` values still take precedence, so real deployment env vars are unaffected; the file is simply skipped when absent (e.g. production).
- **[Risk]** Payment and Order status could drift if the webhook handler's transaction partially fails (Payment updates but Order transition fails, or vice versa) → **Mitigation**: both writes happen in the same DB transaction, following `txRoute`, the same pattern M1/M2 use for Reservation+Order atomicity.
- **[Trade-off]** Stripe's Pix support for a given account/region needs verification against the platform's actual Stripe account configuration before implementation — flagged as an Open Question below rather than assumed.
- **[Trade-off]** No storefront ships with this change, so the payment page can only be reached by directly navigating to an `orderId` (e.g., a link) — accepted, matches the proposal's explicit scoping to a minimal payment page.

## Migration Plan

- Add `payments` table (id, tenant_id, order_id, provider, provider_payment_id, method, status, amount_cents, currency, created_at, updated_at), enrolled in tenant RLS like `orders`/`reservations` were.
- Add `payment_events` table (id, tenant_id, payment_id, provider_event_id unique, type, processed_at) for webhook idempotency.
- Add `payment_status_history` table (payment id, from, to, actor/system cause, timestamp), mirroring `order_status_history`.
- New migration file following the existing `apps/backend/migrations/17000000NNNNN_*.cjs` numbering (next after `1700000015000_orders.cjs`).
- No backfill needed — purely additive tables.

## Open Questions

- Does the platform's Stripe account have Pix enabled/available (Stripe's Pix support is Brazil-specific and account-gated)? Needs verification against the actual Stripe account before implementation starts; does not change the spec or design (card-only would just mean Pix scenarios aren't exercisable yet), so safe to defer.
