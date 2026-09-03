## 1. Data model

- [x] 1.1 Add migration creating `platform_admins` (id, email unique, password_hash, created_at, updated_at) and `platform_sessions` (id, admin_id references platform_admins, expires_at, revoked_at, created_at) - no `tenant_id` column, no RLS - and verify `npm run migrate` applies cleanly and `down` drops both tables
- [x] 1.2 Add `env.platformSessionCookieName` (`PLATFORM_SESSION_COOKIE_NAME`, default `cos_platform_session`) alongside the existing `sessionCookieName`, and verify it reads from env with the documented default

## 2. Platform identity module (backend)

- [x] 2.1 Add `PlatformAdmin` domain entity and `PlatformSession` domain entity, mirroring `identity`'s `User`/`Session` shape, and verify unit tests cover validation (invalid email, missing password hash)
- [x] 2.2 Add `platform-admin-repository.kysely.ts` and `platform-session-repository.kysely.ts` infrastructure, and verify repository tests cover create/find-by-email/find-by-id-unscoped
- [x] 2.3 Add `LoginPlatformAdminUseCase` (verify password via existing `password-hasher.argon2.ts`, create a `platform_sessions` row) and `LogoutPlatformAdminUseCase`, and verify unit tests cover success and invalid-credentials paths
- [x] 2.4 Add `platform.controller.ts` (login/logout handlers) and `platform.routes.ts` exposing `POST /platform/login` (public) and `POST /platform/logout`, and verify an integration test can log in and receive the platform cookie
- [x] 2.5 Add `resolvePlatformIdentity` middleware (reads `env.platformSessionCookieName`, resolves session unscoped, sets `req.platformIdentity = { adminId }`) and `requirePlatformAuth` middleware, and verify a request without the cookie is rejected with 401 while a valid one populates `req.platformIdentity`
- [x] 2.6 Register `resolvePlatformIdentity` and the new `platformRouter` in `http/app.ts`, and verify the app boots and `POST /platform/login` responds

## 3. Tenant management endpoints

- [x] 3.1 Add `GET /platform/organizations` (guarded by `requirePlatformAuth`, plain transaction with no `app.tenant_id` set, lists all Organizations) and verify an integration test returns every seeded Organization
- [x] 3.2 Add `POST /platform/organizations` (guarded by `requirePlatformAuth`, reuses existing `CreateOrganizationUseCase`) and verify an integration test creates an Organization with a chosen name/slug and rejects a duplicate slug with 409
- [x] 3.3 Remove the public `POST /organizations` route from `organization.routes.ts` (keep `GET /organizations/:id` as-is) and verify a request to the old public route now 404s/405s
- [x] 3.4 Update `apps/backend/scripts/seed-storefront-test-tenant.ts` (and any other caller of the removed public route) to seed via direct DB insert or an authenticated `POST /platform/organizations` call, and verify the script still runs end to end (audit: the script already inserts into `organizations` directly via Kysely, never called the public route - `grep` across `apps/backend`/`apps/web` confirmed no other caller of `POST /organizations` either; no change needed)

## 4. Frontend platform console

- [x] 4.1 Add `apps/web/app/platform/login/page.tsx` and `actions.ts` (email + password only, no tenantId field), and verify manually that a valid platform admin can log in and an invalid one sees an error
- [x] 4.2 Add `apps/web/app/platform/tenants/page.tsx` listing all Organizations (name, slug) fetched from `GET /platform/organizations`, and verify manually the list renders seeded tenants
- [x] 4.3 Add a "new tenant" form on the tenants page (name + editable/auto-suggested slug) posting to `POST /platform/organizations`, and verify manually a new tenant appears in the list after creation and a duplicate slug shows a validation error
- [x] 4.4 Add minimal platform layout/nav distinct from `AdminNav`, and verify `/platform/tenants` is unreachable without a valid platform session (redirects to `/platform/login`)

## 5. Operational seed

- [x] 5.1 Document the manual step to create the first `platform_admins` row per environment (e.g. a one-off seed script invoked at deploy time), and verify the documented command successfully creates a row that can then log in via `/platform/login`

## 6. Verification

- [x] 6.1 Run the full backend test suite and verify it passes with the new module and the removed public route
- [x] 6.2 Manually walk the end-to-end flow: seed a platform admin, log in at `/platform/login`, create a tenant with a chosen slug at `/platform/tenants`, and verify that tenant then appears and its slug can be used to log into `/admin/login`

## 7. First owner user at tenant creation

- [x] 7.1 Add a `create` method to `UserRepositoryPort`/`KyselyUserRepository` (id, tenantId, email, passwordHash) and to `RoleAssignmentRepositoryPort`/`KyselyRoleAssignmentRepository` (id, tenantId, userId, role), and verify unit/integration tests cover both
- [x] 7.2 Add a use case that creates an Organization, then a User under it, then assigns that user the `owner` role, all within one transaction, and verify a test confirms no Organization is left behind when user/role creation fails
- [x] 7.3 Replace the reused `createOrganizationController` on `POST /platform/organizations` with a platform-specific controller that accepts `name`/`slug`/`email`/`password` and calls the new use case, and verify an integration test creates Organization + User + owner role_assignment in one call and the returned user can subsequently log in via `POST /auth/login` with that tenant id
- [x] 7.4 Update the "new tenant" form in `apps/web/app/platform/tenants` to also collect email and password for the first owner, wired through `createTenant`'s action, and verify manually that after creating a tenant its owner can log in at `/admin/login`
- [x] 7.5 Run the full backend test suite again and verify nothing regresses
