## 1. Monorepo & tooling setup

- [ ] 1.1 Initialize pnpm workspace (`pnpm-workspace.yaml` with `apps/*`, `packages/*`) and verify `pnpm install` succeeds at the root
- [ ] 1.2 Add Turborepo config (`turbo.json`) with `build`, `dev`, `lint`, `test` pipelines and verify `turbo run build` executes across workspace packages
- [ ] 1.3 Scaffold `apps/backend` (Express + TypeScript) and `apps/web` (Next.js + TypeScript) and verify each starts independently (`pnpm --filter backend dev`, `pnpm --filter web dev`)
- [ ] 1.4 Configure shared TypeScript/ESLint config, including an import-boundary rule preventing `infrastructure/` from being imported inside `domain/`, and verify a deliberately-violating import fails lint

## 2. Database & migrations

- [ ] 2.1 Add Postgres to `docker-compose.yml` and verify the backend can connect to it locally
- [ ] 2.2 Set up `node-pg-migrate` and verify `pnpm migrate up` / `pnpm migrate down` run against the local database
- [ ] 2.3 Write migration for `organizations`, `venues` tables (with `tenant_id` where applicable) and verify tables exist after migrating
- [ ] 2.4 Write migration for `users`, `sessions`, `roles`/`role_assignments` tables and verify tables exist after migrating
- [ ] 2.5 Write migration for `audit_log` table and verify it exists after migrating
- [ ] 2.6 Write migration for `organization_configuration` table and verify it exists after migrating
- [ ] 2.7 Write migration for `outbox_events` table plus a trigger that issues `NOTIFY` on insert, and verify a manual `INSERT` triggers a `NOTIFY` audible via `LISTEN`
- [ ] 2.8 Write RLS policies for every tenant-owned table (`venues`, `organization_configuration`, etc.) keyed on a `app.tenant_id` session variable, and verify a query without `SET LOCAL app.tenant_id` returns zero rows while a query with the wrong tenant id set also returns zero rows for another tenant's data
- [ ] 2.9 Set up Kysely with a generated/typed schema matching the migrations and verify a sample typed query compiles and runs

## 3. Cross-cutting backend infrastructure

- [ ] 3.1 Implement a request-scoped transaction wrapper that resolves the acting tenant and issues `SET LOCAL app.tenant_id` before any query in the request, and verify via a test that queries inside a request only see that tenant's rows
- [ ] 3.2 Implement the outbox publisher adapter (writes to `outbox_events` in the same transaction as the domain change) and verify a domain change and its event row commit or roll back together
- [ ] 3.3 Implement the `outbox-worker` process: `LISTEN` for notifications, `SELECT ... FOR UPDATE SKIP LOCKED` pending events, dispatch to registered consumers, mark processed, and verify it processes a manually inserted outbox row end-to-end
- [ ] 3.4 Add a coarse polling safety net in the outbox worker (e.g. every N seconds) so a missed `NOTIFY` only adds latency, and verify events are still processed if `NOTIFY` is suppressed in a test
- [ ] 3.5 Implement idempotent consumer dispatch (dedupe by event id) and verify redelivering the same event id does not duplicate its effect

## 4. Identity module

- [ ] 4.1 Implement `domain` layer: User entity, Session value object/port, password hashing policy, and verify unit tests for entity invariants
- [ ] 4.2 Implement `application` layer use-cases: Login, Logout, ResolveSessionIdentity, and verify unit tests cover valid/invalid credentials
- [ ] 4.3 Implement `infrastructure` adapters: Kysely-backed session store, httpOnly cookie issuance/parsing, HTTP routes/controllers, and verify an integration test logs in, receives a cookie, and accesses a protected route with it
- [ ] 4.4 Implement session revocation (logout, admin-triggered) and verify a revoked session's cookie no longer authenticates

## 5. Authorization module

- [ ] 5.1 Implement `domain` layer: Role enum (Owner, Admin, Finance, Sales, Operator, Access Operator, Read Only), Permission value objects, and verify unit tests for role-permission mapping
- [ ] 5.2 Implement `application` layer: PermissionCheck use-case validating identity + organization + permission + ownership, and verify unit tests cover allow/deny cases including cross-tenant denial
- [ ] 5.3 Implement `infrastructure`: Express middleware/guard applying the permission check to protected routes, and verify an integration test confirms a direct API call bypassing the UI is still denied for an unauthorized role

## 6. Organization module

- [ ] 6.1 Implement `domain` layer: Organization aggregate, TenantId value object, `organization.created` domain event, and verify unit tests for entity invariants
- [ ] 6.2 Implement `application` layer: CreateOrganization use-case, and verify unit test creates an organization and emits the domain event via the outbox publisher port
- [ ] 6.3 Implement `infrastructure`: Kysely repository, HTTP routes/controllers, and verify an integration test creates an organization via HTTP and persists it
- [ ] 6.4 Verify cross-tenant isolation with an integration test: a user from Organization A cannot read/list Organization B's data

## 7. Venue module

- [ ] 7.1 Implement `domain` layer: Venue entity (owned by an Organization), and verify unit tests for entity invariants
- [ ] 7.2 Implement `application` layer: CreateVenue use-case validating the parent Organization exists and belongs to the acting tenant (via direct call into Organization's use-case), and verify unit tests cover creation and the invalid-parent-organization rejection
- [ ] 7.3 Implement `infrastructure`: Kysely repository, HTTP routes/controllers, and verify an integration test creates a venue under an organization and lists multiple venues for it
- [ ] 7.4 Verify cross-tenant isolation with an integration test: a user from Organization A cannot read/modify a Venue belonging to Organization B

## 8. Configuration module

- [ ] 8.1 Implement `domain` layer: OrganizationConfiguration aggregate (key/value scoped to tenant), and verify unit tests for entity invariants
- [ ] 8.2 Implement `application` layer: GetConfiguration, SetConfiguration use-cases enforcing the authorization port, and verify unit tests cover authorized/unauthorized writes
- [ ] 8.3 Implement `infrastructure`: Kysely repository, HTTP routes/controllers, and verify an integration test sets and reads back a configuration value scoped to one organization without affecting another
- [ ] 8.4 Verify cross-tenant isolation with an integration test: a user from Organization A cannot read/write Organization B's configuration

## 9. Audit module

- [ ] 9.1 Implement `domain` layer: AuditEntry entity requiring an identifiable actor, and verify unit tests reject construction without an actor
- [ ] 9.2 Implement `application` layer: RecordAuditEntry use-case consumed as an outbox event handler, and verify unit tests cover idempotent handling of a duplicate event id
- [ ] 9.3 Implement `infrastructure`: Kysely repository, registration as an outbox consumer for sensitive events (`organization.*`, `configuration.*`, authorization/permission changes), and verify an integration test triggers a configuration change and confirms exactly one audit entry is recorded, including after simulating redelivery of the same event
- [ ] 9.4 Verify end-to-end durability with an integration test: kill the outbox worker mid-processing and confirm the pending event is still processed (and audited exactly once) after restart

## 10. Dockerization

- [ ] 10.1 Write `Dockerfile` for `apps/backend` (used by both `backend` and `outbox-worker` services with different start commands) and verify it builds
- [ ] 10.2 Write `Dockerfile` for `apps/web` and verify it builds
- [ ] 10.3 Complete `docker-compose.yml` with `backend`, `web`, `postgres`, `outbox-worker` services, environment variables, and health checks, and verify `docker-compose up` brings up all four services and the backend responds to a health check
- [ ] 10.4 Verify `docker-compose up` runs migrations (or a documented one-off migrate step) before `backend`/`outbox-worker` start, confirmed by a clean `docker-compose up` from an empty database succeeding end-to-end

## 11. End-to-end verification

- [ ] 11.1 Write an end-to-end test/script that: creates an organization, creates a venue under it, logs in as a user with the Owner role, changes organization configuration, and confirms an audit entry was recorded — all through the Docker Compose stack
- [ ] 11.2 Write an end-to-end test that confirms a user from a second organization cannot see or modify the first organization's venue, configuration, or audit entries
