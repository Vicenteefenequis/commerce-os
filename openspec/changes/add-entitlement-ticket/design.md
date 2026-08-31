## Context

See proposal.md - Why. Relevant existing pieces this builds on:

- `commerce/domain/events.ts` already publishes `order.status_changed` (with `fromStatus`/`toStatus`) through the outbox (`events/outbox-publisher.ts`), in the same transaction as the status change.
- `audit/infrastructure/audit-outbox-consumer.ts` is the existing pattern for reacting to domain events outside the originating transaction: `registerOutboxConsumer(EVENT_TYPE, async (event, trx) => { ... })`.
- `payments/domain/ports.ts` defines `PaymentProviderPort` as the existing precedent for a swappable external-provider abstraction (PAY-001), concretely implemented by `stripe-payment-provider.ts` and configured only via env var. No equivalent exists yet for email.
- `Order` and `OrderLine` currently carry no buyer identity at all (`db/schema.ts` has no customer-shaped table beyond `users` for staff and `leads` for the marketing landing page).
- `CreateOrderUseCase` (commerce/application) is the single place Orders are created, whether from staff-initiated or guest checkout (see its `actorUserId` doc comment on the guest/system-user distinction).

## Goals / Non-Goals

**Goals:**
- Let a paid Order result in one scannable Ticket per purchased unit, addressed to a known Customer.
- Keep Entitlement/Ticket issuance decoupled from payment processing itself, the same way Audit is decoupled from the events it reacts to.
- Introduce the email-sending seam (`EmailProviderPort`) now, without requiring a real provider to be configured for this change to be considered done.

**Non-Goals:**
- Access Control / scanning (M5) — this change issues and stores Tickets, it does not validate or consume them at a door.
- A full Customer/CRM bounded context (profiles, segments, interactions from PRD §12) — `customer/customer` here is intentionally the minimal shape checkout needs: email + name, tenant-scoped, reused by email.
- Choosing and configuring a real email provider account (Resend or otherwise) — operational follow-up, tracked in tasks.md as a manual step, not code.
- Multi-use or balance-carrying Entitlements ("acesso ilimitado por um ano" from the PRD's own example) — out of scope; every Entitlement here grants exactly one use.

## Decisions

**One Entitlement per unit, not one Entitlement with an amount.** A `quantity: 3` line issues 3 Entitlements of one use each, not 1 Entitlement with `amount: 3`. Chosen because each ticket is scanned by a different person at the door (a group of 3 needs 3 independent QR codes); a shared-balance Entitlement would need the scanner to track partial consumption across separate physical people, which is unnecessary complexity for the MVP's walk-in flow. Multi-use passes are deferred (see Non-Goals).

**Entitlement:Ticket is 1:1.** Given the above, there is no case in this change where an Entitlement has more than one Ticket or a Ticket manifests more than one Entitlement. The two are kept as separate capabilities (matching the PRD's own conceptual split: "Ticket = manifestação utilizável de um Entitlement") because Access Control (M5) is expected to reason about Entitlement state (consumed or not) while the Ticket stays the stable, scannable identifier — keeping them separate now avoids a later split under M5 pressure.

**Issuance via outbox consumer on `order.status_changed`, filtered to `toStatus: "paid"`.** Reuses the existing event and transport rather than adding a new `order.paid` event type, mirroring how audit consumes the same event. The consumer runs in its own transaction (per `registerOutboxConsumer`'s contract), separate from the transaction that moved the Order to `paid`.

**Idempotent issuance keyed by Order id.** Before issuing, the consumer checks whether Entitlements already exist for the Order; if so it is a no-op. This satisfies "Entitlement issuance is not duplicated" without needing a separate claim table (unlike payments' `PaymentEventRepositoryPort`, which claims by provider event id) — Order id is already unique and the check is a simple existence query in the same transaction as the insert.

**`EmailProviderPort` mirrors `PaymentProviderPort`'s shape.** A `send(to, subject, body)`-shaped port in a new `communication` module, with delivery attempts recorded (spec: "Delivery outcome is recorded"). No adapter is wired to a real provider; a `NullEmailProvider` (or equivalent) satisfies the port and always records "not attempted / not configured", so the rest of the system has a concrete implementation to run against in dev/tests without crashing.

**Customer resolved by (tenantId, email), case-insensitively.** Checkout upserts: existing Customer for that tenant+email is reused, updating name if it differs; otherwise a new Customer is created. This lives in the `customer` module, called from `CreateOrderUseCase` the same way it already calls into `capacity` (`CreateReservationUseCase`) for resource-linked lines.

## Risks / Trade-offs

- [Checkout now requires customer info, a breaking change to `POST /checkout`'s existing request shape] → Acceptable: `commerce/checkout` has no public storefront UI yet (per roadmap M2 notes, only the API exists), so no shipped frontend depends on the current shape.
- [No real email provider means the MVP's "enviar ticket" Definition-of-Done item stays unverified end-to-end until an account is configured] → Matches the already-accepted posture for Pix (code-complete, blocked on external config); tracked explicitly in tasks.md as a manual follow-up, not hidden.
- [Issuing Entitlements outside the paid-transition transaction means a brief window where an Order is `paid` but Entitlements haven't landed yet] → Same eventual-consistency window Audit already accepts for its own consumers; access control (M5) isn't built yet so nothing currently depends on issuance being synchronous with payment.

## Migration Plan

`customers`, `entitlements`, `tickets`, and the delivery-attempt table are new. `orders.customer_id` is a required column added to an existing table: the migration backfills a per-tenant placeholder Customer (`unknown+<tenant_id>@example.invalid`) for any pre-existing Order rows before making the column `NOT NULL`, since Postgres rejects a required column with no default on a non-empty table - discovered running this migration against the dev database, which already had test-seeded Orders. No existing Orders retroactively get Entitlements (issuance only reacts to a live `paid` transition going forward). Rollout is a normal deploy; no feature flag, since guest checkout has no live frontend consumer to break gradually.
