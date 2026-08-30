## Context

The existing Foundation modules (`organization`, `venue`, `identity`, `authorization`, `configuration`, `audit`) establish the patterns this change follows:

- Hexagonal module layout: `domain/` (entities, ports), `application/` (use cases), `infrastructure/` (Kysely repository, Express routes/controller).
- Every tenant-owned table carries `tenant_id`, is enrolled in `TENANT_TABLES` in `migrations/1700000006000_row-level-security.cjs`-style RLS policies, and every repository call is scoped to the tenant on top of that (defense in depth, per `foundation/organization` - Tenant data isolation).
- Routes are wired through `requireAuth` + `requirePermission("<resource>:<action>")` (see `venue.routes.ts`), and mutations flow through `txRoute`, which runs inside a transaction with `app.tenant_id` set via `set_config`.
- Audit entries are written through the existing `audit` module inside the same transaction as the mutation they describe.

See proposal.md for motivation and scope; see specs/catalog/product and specs/capacity/resource for requirements.

## Goals / Non-Goals

**Goals:**
- Data model and API surface for Product (catalog) and Resource (capacity), consistent with the Venue pattern.
- Correct, race-safe available-capacity calculation and hard-capacity enforcement under concurrent commitments.

**Non-Goals:**
- Actually holding capacity during a checkout flow (no `commitments` producer yet — that lands with Reservation/Checkout in the next slice). This change only builds the capacity ledger and query path; nothing writes to it yet except tests/design validation.
- Pricing beyond one price per variant (no Offer/discount model).
- An `/availability` endpoint joining Product + Resource; that is Reservation-slice work per PRD §40.

## Decisions

### D1: Product and Resource are independent capabilities, not a Product-owns-Resource relationship
A Product does not embed capacity directly. Instead, capacity lives on Resource, and a future join table (`product_resources`, out of scope here) will link which Product consumes which Resource and how much. Rationale: the PRD explicitly separates these two concepts (§13) because the same Resource (e.g. "morning entry slot") can be consumed by multiple Products (adult ticket, child ticket, guided-tour package), and the mapping is itself business config, not a fixed 1:1. Building the link now would guess at a shape we don't have a consumer for yet — Checkout is what actually needs it.

### D2: Capacity ledger as an append-only commitments table, not a mutable counter
Available capacity is `configured_capacity - SUM(commitments.amount) WHERE status IN ('held','consumed')` rather than a `capacity_used` column decremented/incremented in place.

Alternatives considered:
- Mutable counter on the resource/period row: simpler reads, but re-derives nothing from history, makes the "concurrent commitments do not exceed hard capacity" scenario harder to get right without a table-level lock (which serializes all writes to a hot resource), and gives no audit trail of who committed what.
- Ledger (chosen): a new commitment is an INSERT guarded by a capacity check in the same transaction; SUM is read with `SELECT ... FOR UPDATE` semantics via a serializable check (see D3). Slightly more read cost, but correct under concurrency and self-auditing.

This change creates the `resource_capacity_commitments` table and the read-side SUM, but nothing produces commitments yet (see Non-Goals) — that's wired up when Reservation lands. The table exists now so the capacity calculation requirement (CAP-004) has something real to sum over and can be tested end-to-end with directly-inserted test commitments.

### D3: Concurrency control via a Postgres advisory-lock-free row lock on the period row
To satisfy "concurrent commitments do not exceed hard capacity" (spec scenario) without introducing new infrastructure (no Redis, no distributed lock), the capacity-check-then-insert runs as: `SELECT ... FROM resource_capacity_periods WHERE resource_id = $1 AND period = $2 FOR UPDATE` inside the same transaction as the commitment INSERT. This serializes concurrent commitment attempts against the same resource+period at the database level, consistent with how the rest of the codebase already relies on Postgres transactions (`txRoute`) rather than application-level locking.

Alternative considered: optimistic concurrency (version column, retry on conflict). Rejected for this slice — pessimistic row lock is simpler to reason about and the contention window (one INSERT) is short; revisit if lock contention becomes a measured problem.

### D4: Capacity period granularity is a plain date, not a datetime range
`resource_capacity_periods.period` is a `date`. Slot-level (time-of-day) capacity is listed in the PRD as "slots opcionais" for the MVP and is not required by this change's scenarios. Modeling it as `date` now avoids inventing a slot/time-range shape we'd likely have to revise once Availability/Reservation defines how slots actually get queried.

## Risks / Trade-offs

- [Risk] Ledger table grows unbounded as commitments accumulate → Mitigation: not a concern at MVP volume; revisit with partitioning/archival if it becomes one (same posture as `audit_log`, `outbox_events`).
- [Risk] Row lock on `resource_capacity_periods` becomes a bottleneck for a single very hot resource+date → Mitigation: acceptable at pilot scale (single venue, low concurrent checkout volume); flagged in proposal.md as future work if it surfaces.
- [Risk] Building `resource_capacity_commitments` before any real producer exists risks the shape being wrong once Reservation is specified → Mitigation: kept intentionally minimal (resource_id, period, amount, status, created_at) — the smallest shape the capacity-calculation requirement needs; Reservation slice can extend, not replace, it.

## Migration Plan

New tables only (`products`, `product_variants`, `resources`, `resource_capacity_periods`, `resource_capacity_commitments`), enrolled in the existing RLS `TENANT_TABLES` pattern via a new migration. No changes to existing tables or endpoints. Rollback is a straightforward `down` migration dropping the new tables; no data migration risk since nothing writes to them outside this change's own tests until Reservation lands.
