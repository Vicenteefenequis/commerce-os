## Why

Today, creating a new Organization (tenant) is a public, unauthenticated bootstrap endpoint (`POST /organizations`), and there is no way to see or manage the list of tenants already registered — someone provisioning a new customer has to know the tenant's UUID out of band to even log into `/admin`. Worse, nothing in the codebase can create a tenant's first user either (every `users` row so far has come from manual DB seed scripts) — so even after creating a tenant there is no way to log into it. The platform owner needs a dedicated, authenticated place to register a tenant (choosing its name and slug) together with its first login credentials, and to see every tenant that exists.

## What Changes

- Introduce a platform-level identity, separate from tenant `users`/`sessions`: a `platform_admins` table and `platform_sessions` table, with no `tenant_id` — this actor is not scoped to any single Organization.
- Add a `requirePlatformAuth` middleware and a distinct session cookie (separate name from the tenant session cookie), so a person can hold a tenant admin session and a platform session at the same time without collision.
- Add authenticated platform routes: `POST /platform/login`, `POST /platform/logout`, `GET /platform/organizations` (list all tenants), `POST /platform/organizations` (create a tenant with name + slug plus an email + password for its first user, creating the Organization, the User, and its `owner` role_assignment atomically).
- **BREAKING**: Lock down `POST /organizations` — it no longer runs as a public/unauthenticated bootstrap route. Tenant creation now requires a platform admin session via `/platform/organizations`.
- Add a new frontend area `apps/web/app/platform` (isolated from `/admin`): `/platform/login` and `/platform/tenants` (list + create form, with slug editable/auto-suggested from name, plus the first owner's email/password).
- Seeding the first `platform_admins` row is an operational/deploy-time concern (migration or seed script), not a product flow — out of scope for this change to build a UI for it.

## Capabilities

### New Capabilities
- `foundation/platform-admin`: platform-level admin identity (login, session) and the ability to list and register Organizations (tenants) outside any tenant's RBAC.

### Modified Capabilities
- `foundation/organization`: Organization creation now requires an authenticated platform admin actor instead of being an open/public endpoint; add a scenario rejecting unauthenticated creation attempts.

## Impact

- Backend: new `platform` module (domain/application/infrastructure) mirroring the shape of `identity`; new migration for `platform_admins` / `platform_sessions`; `organization.routes.ts` changes from `txRoutePublic` to `requirePlatformAuth`-gated; `env` gains a platform session cookie name. `identity`'s `UserRepositoryPort`/`KyselyUserRepository` and `authorization`'s `RoleAssignmentRepositoryPort`/`KyselyRoleAssignmentRepository` gain `create` methods - neither has ever supported creating a row, only reading.
- Frontend: new `apps/web/app/platform/**` route group, own login form/action, own tenant list/create page (now also collecting the first owner's email/password). `/admin/login` is unaffected (still tenant-scoped).
- Seed scripts / e2e setup that currently call the public `POST /organizations` (e.g. `apps/backend/scripts/seed-storefront-test-tenant.ts`) need to switch to platform-authenticated creation or a direct DB seed.
