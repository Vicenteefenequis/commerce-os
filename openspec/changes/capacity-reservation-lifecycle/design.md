## Context

Follows the same hexagonal module layout, tenant isolation, and audit pattern already used by `capacity/resource` (see `openspec/changes/archive/2026-08-30-add-catalog-capacity/design.md` D5): `domain/` (entities, ports), `application/` (use cases), `infrastructure/` (Kysely repository, Express routes/controller); routes wired through `requireAuth` + `requirePermission`; mutations run inside `txRoute`; audit entries are written by `audit`'s outbox consumers reacting to domain events published in the same transaction as the write.

The capacity ledger already exists: `resource_capacity_commitments` rows have a `held | consumed | released` status, and `CommitCapacityUseCase` inserts a `held` row under an advisory lock that guarantees hard-capacity is never exceeded under concurrency (prior design D3). Nothing currently transitions a commitment out of `held`. See proposal.md for motivation and specs/capacity/reservation, specs/capacity/resource for requirements.

## Goals / Non-Goals

**Goals:**
- A Reservation aggregate with its own explicit status, backed 1:1 by a capacity commitment, so callers (Checkout, Access Control) reason about business-level reservation state rather than the commitment's narrower ledger status.
- Release/consume operations on commitments that are safe under concurrent/duplicate calls (idempotent-safe rejection, not corruption).

**Non-Goals:**
- Automatic background expiry (a cron/worker sweeping `pending` reservations past their TTL). This change adds the `ExpireReservationUseCase` operation and an `expiresAt` field; wiring a scheduler to call it periodically is ops/infra work for a later slice (M2 Checkout is the first real caller and can decide the sweep cadence it needs).
- Any HTTP surface consumed by end customers (checkout, payment). This change only exposes admin/internal routes sufficient to drive and test the lifecycle; Checkout (M2) will call these use cases directly, not through a public reservation API.
- Linking Reservation to Order/Product. Reservation only knows about Resource + period + amount, per the existing `capacity` module boundary (prior design D1: Product/Resource stay independent; the same separation applies to Reservation/Order).

## Decisions

### D1: Reservation is a new aggregate referencing a commitment, not a renamed commitment
A `reservations` table (`id`, `tenant_id`, `resource_id`, `period`, `amount`, `status`, `commitment_id`, `expires_at`, `created_at`, `updated_at`) is added, with `commitment_id` referencing the `resource_capacity_commitments` row created by `CommitCapacityUseCase` at Reservation-creation time.

Alternatives considered:
- Extend `resource_capacity_commitments` with the full Reservation status set (`pending/confirmed/expired/cancelled/consumed`) instead of its current `held/consumed/released`, and drop the separate table. Rejected: the commitment's status only needs to answer "does this still count toward committed capacity" (held/consumed vs. released) — that's the ledger's job (spec: capacity/resource). Reservation's status answers a business question (has payment been confirmed, has the customer entered) that Checkout/Access Control need to query without leaking ledger vocabulary into their domain. Keeping them separate also means a future capacity primitive that isn't a Reservation (if one ever exists) can still use the commitment ledger directly.
- 1:1 embed (denormalize commitment fields onto `reservations`, drop the separate commitment row). Rejected: `CommitCapacityUseCase` and its advisory-lock concurrency guarantee already exist and are tested against the commitment shape; duplicating that logic against a differently-shaped table risks re-introducing the overbooking race the prior design solved.

### D2: Status transitions are enforced as guarded single-row updates, not a state machine library
Each transition (`confirm`, `expire`, `cancel`, `consume`) is implemented as `UPDATE reservations SET status = $new WHERE id = $id AND tenant_id = $tenant AND status = $expectedCurrent`, checking the affected row count. Zero rows affected means the reservation was not in the expected status (already transitioned, concurrently raced, or wrong id) and the use case raises a typed error (spec scenarios: "Confirming a non-pending reservation is rejected", etc.) rather than silently no-op-ing.

This mirrors D3's advisory-lock reasoning (correctness under concurrency without new infrastructure) but doesn't need a lock here: a single-row conditional `UPDATE` is already atomic in Postgres, and only one transition can win when two race for the same row.

The paired commitment update (`releaseCommitment` / `markConsumed`) uses the identical guarded-update shape (`WHERE id = $id AND status = 'held'`) and runs in the same transaction as the reservation's status update, so a reservation can never end up `expired`/`cancelled` while its commitment is still `held`, or `consumed` while its commitment isn't.

### D3: Expiry is a callable operation, not a passive TTL check on read
`ExpireReservationUseCase` performs the same guarded update as any other transition (`WHERE status = 'pending' AND expires_at <= now()`), callable by anything (a future sweeper, or a caller that lazily expires before acting). Available-capacity reads are unaffected either way, since a `held` commitment counts as committed regardless of whether its owning reservation's TTL has technically passed — precision here is Checkout's concern once it decides how promptly it needs holds to be reclaimed (Non-Goals).

### D4: Reuse the outbox/audit pattern for every transition
Each use case publishes a domain event (`reservation.created`, `reservation.confirmed`, `reservation.expired`, `reservation.cancelled`, `reservation.consumed`) via `OutboxEventPublisher` in the same transaction as its write; `registerAuditConsumers` gains a handler per event type, matching how `capacity/resource` already audits commitment creation and capacity overrides.

## Risks / Trade-offs

- [Risk] `commitment_id` foreign key means a Reservation cannot exist without first successfully committing capacity, so a rejected hold and a rejected Reservation are the same failure path — acceptable since nothing currently needs to create a Reservation without also holding capacity (that's the entire point of the aggregate).
- [Risk] No scheduler ships in this change, so `pending` reservations that are abandoned stay `pending` (and their capacity stays held) until something calls `ExpireReservationUseCase` → Mitigation: explicitly called out in Non-Goals; M2 Checkout must decide its own expiry-trigger strategy (e.g. call `ExpireReservationUseCase` opportunistically, or add a scheduled sweep) before it can rely on held capacity being reliably reclaimed.
- [Risk] Guarded single-row updates give no visibility into *why* a transition was rejected beyond "not in expected status" → Mitigation: acceptable for this internal-only surface; a public-facing error message can be layered on by whichever caller (Checkout) has the customer-facing context.

## Migration Plan

New table only (`reservations`), enrolled in the existing RLS `TENANT_TABLES` pattern via a new migration, with a foreign key to `resource_capacity_commitments`. No changes to existing tables, endpoints, or the `resource_capacity_commitments` status enum (`held | consumed | released` already covers what release/consume need). Rollback is a straightforward `down` migration dropping the new table; no data migration risk since nothing writes to it outside this change's own tests until Checkout (M2) lands.
