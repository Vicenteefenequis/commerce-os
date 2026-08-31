## 1. Backend: session introspection

- [ ] 1.1 Add `meController` in `identity.controller.ts` returning `{ tenantId, userId, roles, email, organizationName }`: `req.identity` for `tenantId`/`userId`/`roles`, `KyselyUserRepository` for `email`, and the `organization` module's `OrganizationRepositoryPort` (`KyselyOrganizationRepository.findById(tenantId)`) for `organizationName`; register `GET /auth/me` with `requireAuth` in `identity.routes.ts`; verify a request with a valid session cookie returns 200 with that body
- [ ] 1.2 Verify a request without a valid session cookie to `GET /auth/me` returns 401 (via existing `requireAuth` behavior, no new logic needed)

## 2. Frontend: route protection middleware

- [ ] 2.1 Add `apps/web/middleware.ts` with a matcher covering `/login`, `/venues`, `/products`, `/resources`, that calls the backend's `GET /auth/me` forwarding the request's `Cookie` header
- [ ] 2.2 Redirect to `/login` when `/venues`, `/products`, or `/resources` is requested and `/auth/me` returns non-200; verify by requesting each route without a session cookie and observing the redirect
- [ ] 2.3 Redirect to `/venues` when `/login` is requested and `/auth/me` returns 200; verify by requesting `/login` with a valid session cookie and observing the redirect
- [ ] 2.4 Verify each protected route still renders normally with a valid session cookie, and `/login` still renders the form without one

## 3. Frontend: nav session display and logout

- [ ] 3.1 Convert `AdminNav` to an async Server Component that calls `backendFetch("/auth/me")`; verify it renders the user's `email` and `organizationName` (instead of a raw id) when the call succeeds
- [ ] 3.2 Keep the existing "Entrar" link as the fallback when `/auth/me` returns non-200; verify by rendering a protected page's nav without a session cookie
- [ ] 3.3 Add a `logout` Server Action (e.g. alongside `login` in `apps/web/app/login/actions.ts`) that calls `backendFetch("/auth/logout", { method: "POST" })`, applies the returned `Set-Cookie` via `applySetCookie`, and redirects to `/login`
- [ ] 3.4 Wire the logout action into `AdminNav`'s authenticated state as a form/button; verify triggering it clears the session cookie and lands on `/login`

## 4. End-to-end verification

- [ ] 4.1 Manually walk the full flow: logged out -> visit `/venues` (redirected to `/login`) -> log in (redirected to `/venues`, nav shows tenantId) -> visit `/login` directly (redirected to `/venues`) -> trigger logout (redirected to `/login`, nav on any protected route now redirects again)
