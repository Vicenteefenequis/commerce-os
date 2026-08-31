## Context

`catalog/product` and `capacity/resource` exist today with no link between them — a `ProductVariant` and a `Resource` only share a `venueId`. `capacity/reservation` (M1) provides a working hold lifecycle (`pending → confirmed → expired/cancelled/consumed`) via `CreateReservationUseCase` and friends, gated behind `requirePermission("reservation:manage")` — i.e. an internal, server-to-server API, not something a customer calls directly. `apps/web` has no public storefront today, only `(marketing)` and `admin`. See proposal.md - Why.

## Goals / Non-Goals

**Goals:**
- Close the Product → Resource gap so an Order line can determine what capacity (if any) it must hold.
- Give the platform a real `Order` with an explicit, audited lifecycle and a commercial-terms snapshot.
- Provide a checkout API that is safe to call from an untrusted client (server-side pricing, capacity, dedup).

**Non-Goals:**
- No public storefront UI (cart, product browsing, checkout screens) — API only, in `apps/web` or elsewhere, in this change.
- No payment integration — `awaiting_payment → paid` transition exists as a state but nothing drives it yet; that is M3.
- No refund logic beyond having `partially_refunded`/`refunded` as terminal-adjacent states in the lifecycle.
- No support for a variant consuming capacity from more than one Resource, or from different Resources across periods (see Decisions).

## Decisions

### Variant → Resource link: fixed, optional `resourceId` on `ProductVariant`
Confirmed with the user: a variant always maps to the same Resource, never varies by period. So `ProductVariant.resourceId` is a nullable, single foreign key — not a many-to-many mapping table.

Alternatives considered:
- **Mapping table** (`variant_capacity_map`), supporting N:N and per-period overrides — rejected as unneeded complexity; nothing in the domain today needs a variant to draw from more than one Resource or to change Resource by period, and the PRD's anti-over-engineering guidance (risk R1) argues against building for a case that doesn't exist yet.
- **Resource/period supplied by the client at checkout, server just validates** — rejected: the "allowed" check still needs a source of truth, so this just hides the same decision behind a validation step instead of making it explicit in the schema.

A variant with `resourceId = null` holds no capacity — this is how capacity-unconstrained products (no vaga control) are represented, with no separate flag needed.

### Order → Reservation: one Reservation per capacity-bound Order line
An `Order` has one or more lines; a line whose variant has a `resourceId` gets exactly one `Reservation` (quantity = line quantity), created in the same transaction as the Order. A line without `resourceId` gets no Reservation. This reuses `CreateReservationUseCase`/`CancelReservationUseCase`/`ConfirmReservationUseCase` unchanged from M1 — checkout is simply their first real caller.

### Checkout duplicate prevention: idempotency key
CHK-005 is satisfied with a client-supplied idempotency key (e.g. a cart/session token) that the server uses to detect and short-circuit a retried checkout submission, returning the already-created Order instead of creating a second one. Rejected alternative: relying on capacity exhaustion to implicitly prevent duplicates — doesn't hold when capacity is unconstrained (no `resourceId`) or plentiful, and doesn't address the "accidental" double-submit case the requirement targets (e.g. a client double-tapping "pay").

### Order status transitions: append-only history table
ORD-002 ("changes must be recorded") is implemented as an `order_status_history` row per transition (order id, from, to, actor/system cause, timestamp), mirroring the audit-log pattern already used by `capacity/reservation` rather than inventing a new mechanism.

## Risks / Trade-offs

- **[Risk]** Reservation creation and Order creation must be atomic (both happen, or neither) → **Mitigation**: both run in the same DB transaction, following the pattern `capacity/reservation`'s use cases already use (`txRoute`).
- **[Risk]** A variant's `resourceId` could be set after Orders referencing it already exist without capacity holds, creating inconsistent history → **Mitigation**: out of scope for this change (variant mutation after order history exists is an edge case); flagged here rather than silently ignored.
- **[Trade-off]** No storefront UI ships with this change, so the checkout API is unverifiable end-to-end by a real user until a follow-up change builds it → accepted, matches the proposal's explicit Impact scoping.

## Migration Plan

- Add `resource_id` (nullable FK to `resources`) to the existing product-variant table.
- Add `orders`, `order_lines`, `order_status_history` tables (new migration file following the existing `apps/backend/migrations/17000000NNNNN_*.cjs` numbering), enrolled in `TENANT_TABLES` RLS like `reservations` was in M1.
- No backfill needed — `resource_id` defaults to `null` for all existing variants (no capacity change for anything already in the catalog).
