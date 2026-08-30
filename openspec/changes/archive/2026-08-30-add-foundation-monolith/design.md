## Context

Greenfield project (see proposal.md - Why). No existing code, no existing specs. This design covers ADR-001 (multi-tenant strategy), ADR-005 (idempotency), ADR-009 (event model) and ADR-010 (async communication architecture) as named by the PRD (section 38), scoped to the Foundation phase (Organization, Venue, Identity, Authorization, Audit, Configuration).

## Goals / Non-Goals

**Goals:**
- Establish the monorepo, module boundary, and data-isolation conventions every later phase (Sell, Enter, Operate...) will build on.
- Provide working authentication, RBAC enforcement, and audit trail before any commerce capability exists.
- Make tenant isolation defense-in-depth (app layer + database layer) from day one, per PRD 18.1 (secure by default, defense in depth).

**Non-Goals:**
- No commerce, capacity, payment, or fulfillment capability is implemented here (that's Fase 1/2).
- No production deployment topology (Kubernetes, managed Postgres, etc.) — this design covers local/dev Docker Compose only.
- No cross-module event consumers beyond Audit (other modules will add outbox consumers as they're built).

## Decisions

### D1 — Monorepo: pnpm workspaces + Turborepo

`apps/web` (Next.js), `apps/backend` (Express), `packages/*` for shared types/contracts if/when duplication appears. Turborepo gives cached, incremental builds/lint/test across the two apps as they grow. Alternative considered: plain pnpm workspaces without Turborepo — rejected because the two-app + worker setup already benefits from task orchestration and caching from the start.

### D2 — BFF: Next.js Route Handlers, no separate BFF service

The Next.js app calls the backend directly from Route Handlers / Server Actions. Alternative considered: a dedicated Node BFF service between Next.js and the monolith — rejected for this phase since it adds a deployable with no aggregation need yet (single backend, no multiple upstream services to compose).

### D3 — Backend architecture: hexagonal + DDD, one bounded context per Foundation module

`apps/backend/src/modules/{organization,venue,identity,authorization,audit,configuration}/`, each with `domain/` (entities, value objects, domain events, ports), `application/` (use-cases), `infrastructure/` (adapters: HTTP controllers/routes, Kysely repositories, outbox publisher). No DI framework (Express was chosen over NestJS for manual control) — module boundaries are enforced by folder convention and import linting (e.g. ESLint boundaries rule preventing `infrastructure` imports inside `domain`).

Each of the 6 PRD concepts (Organization, Venue, Identity, Authorization, Audit, Configuration) is its own top-level module even though some (e.g. Configuration) start small — chosen explicitly over merging small modules, to keep bounded-context lines stable as the system grows into later phases.

### D4 — Multi-tenant isolation: shared schema + tenant_id + RLS + repository-layer filter

Single Postgres database, single schema, every tenant-owned table carries `tenant_id`. Two independent enforcement layers:
1. **Application layer**: repository methods require `tenantId` as an explicit parameter; there is no repository method that queries without it.
2. **Database layer**: Postgres Row Level Security policies filter every query by `tenant_id`, driven by a session variable (`SET LOCAL app.tenant_id = '<id>'`) set at the start of each request transaction.

Rationale: PRD INV-001 ("uma organização nunca poderá acessar dados privada de outra") is a hard invariant — a single enforcement point is a single point of failure (an app-layer bug leaks cross-tenant data). RLS gives a database-enforced backstop. Alternative considered: schema-per-tenant or database-per-tenant — rejected for the initial ICP (many small/medium tenants, PRD section 8) where per-tenant schema/database multiplies migration and connection-pooling operational cost without a corresponding isolation benefit at this scale.

### D5 — Data layer: Kysely + node-pg-migrate

Kysely gives compile-time-checked query results (unlike Knex) while staying close to raw SQL — important for hand-written RLS-aware queries (`SET LOCAL` per transaction) and for the level of control the team wants over generated SQL. Kysely does not ship a migration tool, so `node-pg-migrate` (plain SQL/JS migrations) owns schema + RLS policy migrations. Alternative considered: Prisma — rejected because its abstraction over SQL makes per-transaction session variables (needed for RLS) and hand-tuned multi-tenant queries harder to express.

### D6 — Inter-module communication: direct calls (sync) + outbox pattern (domain events)

Within a request, one module's application layer may call another module's use-case directly (e.g., creating a Venue calls into Organization's use-case to validate the parent Organization) for synchronous reads/commands. Side effects other modules react to asynchronously (e.g., Audit reacting to `organization.created`) go through an **outbox table**: the publishing use-case writes the domain event to an `outbox_events` table in the same database transaction as its domain change, guaranteeing the event is never lost even if the process crashes right after commit (addresses PRD INV-005 — no duplicate/lost effects from retries).

A dedicated `outbox-worker` process (same backend codebase, different start command) is woken via Postgres `LISTEN/NOTIFY` (a trigger on `outbox_events` issues `NOTIFY`) rather than polling on an interval, reducing latency and idle DB load. The worker reads pending rows with `SELECT ... FOR UPDATE SKIP LOCKED`, dispatches them to registered in-process consumers (e.g., Audit), and marks them processed — consumers must be idempotent (event id dedup) since at-least-once delivery is assumed.

Alternative considered: plain in-process `EventEmitter` — rejected because an event fired and lost on process crash would silently break audit trail completeness (PRD 18.5, INV-008), which the outbox pattern specifically prevents.

### D7 — Authentication: server-side session with httpOnly cookie

Admin users (IAM-001) authenticate via a session stored server-side (Postgres-backed session store), referenced by an httpOnly, secure, SameSite cookie issued by the backend. The Next.js BFF forwards the cookie transparently (same-site deployment) rather than managing its own token. Alternative considered: JWT in a cookie or header — rejected for the admin surface because server-side sessions make immediate revocation (e.g., on role change or offboarding) trivial, which matters given IAM-004's audit/traceability requirements; JWT revocation would need an extra denylist mechanism to get the same guarantee.

### D8 — RBAC: role table + permission checks enforced server-side

Roles from PRD IAM-002 (Owner, Admin, Finance, Sales, Operator, Access Operator, Read Only) are modeled in `authorization`'s domain as a fixed set for this phase (not yet user-defined/custom roles). Every backend route/use-case that touches a tenant-owned entity checks identity + organization + permission + ownership (PRD 18.2) inside the `authorization` module's port, called from the `application` layer of the acting module — never trusted from the frontend (IAM-003).

### D9 — Docker: one container per infrastructure service, not per domain module

`docker-compose.yml` defines `backend` (Express monolith, all domain modules in one process), `web` (Next.js), `postgres`, and `outbox-worker` (same image as `backend`, different start command). Domain modules (Organization, Venue, ...) remain in-process within the `backend` container — hexagonal boundaries make a future extraction of a module into its own service straightforward (its `domain`/`application` layers don't reference Express or Kysely directly), but that extraction is explicitly out of scope now.

## Risks / Trade-offs

- **[Risk]** RLS + app-layer filter is two places to keep in sync when adding a new tenant-owned table → **Mitigation**: a migration checklist/lint rule requiring every new table with `tenant_id` to ship its RLS policy in the same migration.
- **[Risk]** LISTEN/NOTIFY payloads are capped (~8KB) and NOTIFY is not persisted if no one is listening at the moment it fires → **Mitigation**: NOTIFY only carries a wakeup signal (no payload data), the worker always re-queries `outbox_events` for pending rows on wake and also on a coarse safety-net interval, so a missed NOTIFY only adds latency, never data loss.
- **[Risk]** No DI framework (Express, manual boundaries) means nothing stops a developer from importing `infrastructure` code into `domain` by mistake → **Mitigation**: ESLint import-boundary rule per module, enforced in CI.
- **[Risk]** Fixed RBAC role set (D8) may not fit every future tenant's org structure → **Mitigation**: explicitly deferred; PRD does not require custom roles in Foundation/MVP scope.

## Migration Plan

Greenfield — no existing data or running system to migrate. Deployment order: `postgres` → run `node-pg-migrate` migrations (schema + RLS policies) → `backend` + `outbox-worker` → `web`. No rollback plan needed beyond `docker-compose down` / migration `down` scripts, since there are no production users yet.
