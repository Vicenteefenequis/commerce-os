## Context

See proposal.md - Why. Key constraints from the current codebase:

- `users` / `sessions` / `role_assignments` all have a `tenant_id NOT NULL REFERENCES organizations` and a `role` CHECK constraint limited to the 7 tenant-scoped roles (`role.ts`) - there is no room in this schema for an identity that isn't scoped to exactly one Organization.
- `organizations` is deliberately the one table with **no RLS** and **no `tenant_id` column** - it is the tenant boundary itself (`tx-route.ts` comment: "only tables without RLS ... may be touched here").
- `req.identity` (`http/identity.ts`) is a fixed shape `{ userId, tenantId, roles }` used throughout `requireAuth`/`requirePermission`/`txRoute`; every existing route assumes an identity belongs to one tenant.
- The tenant session cookie name comes from `env.sessionCookieName` (`SESSION_COOKIE_NAME`, default `cos_session`).

## Goals / Non-Goals

**Goals:**
- A platform admin can authenticate without any tenant context and manage (list, register) Organizations.
- Zero risk of a platform session being confused with, or granting, tenant-scoped access (and vice versa).
- Close the current public/unauthenticated `POST /organizations` bootstrap hole.

**Non-Goals:**
- "Enter as tenant" / impersonation from the platform console into a tenant's `/admin` dashboard - noted as a follow-up, not built here.
- Any UI or flow for creating the *first* platform admin - that is a deploy-time seed/migration concern.
- Renaming/deleting/deactivating an existing Organization - only list + create are in scope.
- Platform-admin roles/permissions beyond a single implicit "can manage tenants" - no fine-grained platform RBAC.

## Decisions

**A separate `platform` module with its own tables (`platform_admins`, `platform_sessions`), not a reuse of `users`/`sessions`.**
Reusing `users` would require making `tenant_id` nullable and widening the `role` CHECK constraint, both of which weaken a guarantee the rest of the codebase relies on (every tenant-scoped table's RLS keys off `app.tenant_id`, and every route reasons about `identity.tenantId` as "the tenant this data belongs to"). A parallel, minimal pair of tables keeps the blast radius contained to the new module and makes "this actor has no tenant" a structural fact instead of a nullable field someone can forget to check.

**A distinct session cookie name (`env.platformSessionCookieName`, e.g. `SESSION_COOKIE_NAME` sibling `PLATFORM_SESSION_COOKIE_NAME` default `cos_platform_session`), not a flag on the existing cookie.**
Lets one person hold a tenant admin session and a platform session at the same time in the same browser without either overwriting the other, and keeps `resolveIdentity` (tenant) and the new `resolvePlatformIdentity` middleware fully independent - a bug in one cannot leak into the other's cookie.

**`req.platformIdentity: { adminId: string } | undefined`, a new field alongside (not replacing) `req.identity`.**
Mirrors the existing `Identity` pattern (`http/identity.ts`) but deliberately has no `tenantId`, since that would be meaningless for this actor. `requirePlatformAuth` mirrors `requireAuth`.

**`GET /platform/organizations` and `POST /platform/organizations` run in a plain transaction with no `app.tenant_id` set (same shape as today's `txRoutePublic`, just gated by `requirePlatformAuth` instead of being open) - not `txRoute`.**
`organizations` has no RLS, so there is nothing to scope; setting a tenant id wouldn't make sense for this actor anyway. `POST /platform/organizations` calls the existing `CreateOrganizationUseCase` unchanged (it already supports an editable/auto-suggested slug).

**`POST /organizations` (the old public bootstrap route) is removed rather than kept as a fallback.**
Keeping both a public and an authenticated path to create a tenant would defeat the purpose of gating it. Seed scripts that relied on the public route switch to either a direct DB seed or calling `POST /platform/organizations` with a seeded platform admin session.

**Frontend: new isolated route group `apps/web/app/platform`, not a tab inside `/admin`.**
`/admin`'s layout and `AdminNav` assume an authenticated tenant identity throughout (e.g. venue-scoped nav). A platform admin is never "inside" a tenant, so sharing that layout would mean threading a tenant-less special case through every admin page. A small dedicated layout (`/platform/login`, `/platform/tenants`) is simpler and keeps the two concerns visibly separate to anyone reading the codebase.

## Risks / Trade-offs

- **[Two parallel auth systems to maintain]** → Deliberate and narrow: the new module only needs login/logout/session-check, mirroring `identity`'s existing shape closely enough that maintenance cost stays low.
- **[Breaking seed scripts / e2e setup that call the public `POST /organizations`]** → Update `apps/backend/scripts/seed-storefront-test-tenant.ts` (and any e2e setup) as part of this change's tasks; covered by a task, not left dangling.
- **[No UI for the first platform admin means someone must run a manual step post-deploy]** → Acceptable: this happens once per environment, not per tenant. Document the manual step (migration/seed script) in tasks.md.
- **[Two cookies on the same domain]** → Both `httpOnly`, `sameSite: lax`, distinct names - no collision; each middleware reads only its own cookie name.

## Migration Plan

1. Add migration for `platform_admins` and `platform_sessions` (no `tenant_id`, no FK to `organizations`).
2. Add `platform` module (domain/application/infrastructure) mirroring `identity`'s shape; add `requirePlatformAuth`; add `env.platformSessionCookieName`.
3. Add platform routes (`/platform/login`, `/platform/logout`, `GET/POST /platform/organizations`); register the router in `http/app.ts`.
4. Remove the public `POST /organizations` route; update `organization.routes.ts` (`GET /organizations/:id` stays tenant-authenticated as-is).
5. Update seed scripts that depended on the public creation route.
6. Add `apps/web/app/platform/{login,tenants}` pages/actions.
7. Manually seed one `platform_admins` row per environment (documented step, not built UI) so there's a way in.

No rollback complexity beyond a normal migration `down` (drop the two new tables) plus reverting the route change if needed.
