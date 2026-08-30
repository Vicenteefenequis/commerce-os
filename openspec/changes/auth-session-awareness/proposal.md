## Why

The `apps/web` admin screens (`login`, `venues`, `products`, `resources`) have no awareness of the session cookie they already forward to the backend: the nav always shows "Entrar" even when a user is logged in, `/login` can be visited (and re-submitted) while already authenticated, and a logged-out user hitting `/venues`, `/products`, or `/resources` gets a silently empty page instead of being sent to `/login` (the backend's 401 from `requireAuth` is swallowed as "no records"). There is also no way to end a session from the UI even though the backend already supports `POST /auth/logout`.

## What Changes

- Add `GET /auth/me` to the backend: returns the caller's `{ tenantId, userId, roles }` when the session cookie is valid, or 401 when it is not (reusing the existing `requireAuth` middleware and `req.identity`).
- Add `apps/web/middleware.ts`: for `/venues`, `/products`, `/resources` it calls `/auth/me` and redirects to `/login` on 401; for `/login` it redirects to `/venues` on 200.
- `AdminNav` becomes an async Server Component that calls `/auth/me` itself: shows the tenant's `tenantId` and a logout control when authenticated, the existing "Entrar" link otherwise.
- Add a logout Server Action (mirroring the existing `login` action) that calls `POST /auth/logout`, applies the cleared session cookie, and redirects to `/login`.

## Capabilities

### New Capabilities
- `admin/session-awareness`: defines how `apps/web` reflects and enforces session state — redirecting unauthenticated users away from protected admin screens, redirecting authenticated users away from `/login`, showing the current session in the nav, and ending a session from the UI.

### Modified Capabilities
- `foundation/identity`: adds a requirement that an authenticated caller can introspect its own identity via the session cookie (`GET /auth/me`), without changing login/logout/session-resolution behavior.

## Impact

- Affected code: `apps/backend/src/modules/identity/infrastructure/identity.controller.ts`, `identity.routes.ts` (new `/auth/me` handler); `apps/web/middleware.ts` (new file); `apps/web/components/layout/admin-nav.tsx`; `apps/web/app/login/page.tsx`, `apps/web/app/login/actions.ts` (new `logout` action, or a sibling module reused by `AdminNav`).
- No changes to the login/logout/session-resolution behavior already specified in `foundation/identity`, and no changes to `admin/data-fetching`'s server-first policy — `/auth/me` calls and the logout action follow that same policy.
