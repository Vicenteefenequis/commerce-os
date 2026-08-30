## Context

See `proposal.md` for motivation. Relevant existing pieces:

- Backend: `resolveIdentity` middleware (runs on every request, sets `req.identity` from the `cos_session` cookie) and `requireAuth` (401s when `req.identity` is absent) already exist and already guard `/venues`, `/products`, `/resources`. Nothing currently exposes `req.identity` to a caller — there is no `GET /auth/me`.
- Frontend: `apps/web/lib/backend-fetch.ts` forwards cookies from `next/headers` and is only usable from Server Components / Server Actions / Route Handlers, not from `middleware.ts` (Edge runtime, no `next/headers` cookie jar). `admin/data-fetching` already mandates server-first reads and Server Action writes; this change follows that policy rather than revisiting it.

## Goals / Non-Goals

**Goals:**
- Enforce the redirect rules (protected screens vs. `/login`) at a single choke point (`middleware.ts`) rather than duplicated per-page.
- Keep `AdminNav` self-contained: it decides its own display by asking the backend, rather than depending on data threaded through by other layers.

**Non-Goals:**
- Role/permission-based UI (e.g. hiding nav links by role) — out of scope, only session presence/absence is addressed.
- Changing session TTL, cookie attributes, or the login/logout use cases themselves.
- A `/auth/me` response shape beyond `{ tenantId, userId, roles }` (e.g. user display name) — nothing in scope needs more than tenant identity today.

## Decisions

**`GET /auth/me` reuses `requireAuth` and returns `req.identity` as-is.** No new use case class needed — `requireAuth` already guarantees `req.identity` is present when the controller runs, and `Identity` already has the exact shape (`{ userId, tenantId, roles }`) the UI needs.

**Route protection lives in `apps/web/middleware.ts`, not per-page checks.** Chosen over a per-page `redirect()` call (the alternative considered) so the protected-route list and the redirect rules for `/login` live in one file instead of being repeated across `venues/page.tsx`, `products/page.tsx`, `resources/page.tsx`, and `login/page.tsx`. Trade-off accepted: middleware runs on Edge and cannot reuse `backendFetch`'s `next/headers`-based cookie forwarding, so it makes its own direct `fetch` to the backend's `/auth/me`, forwarding only the request's `Cookie` header.

**`AdminNav` calls `/auth/me` itself rather than receiving identity via props or a middleware-injected header.** Chosen over having `middleware.ts` inject an `x-tenant-id` header for pages to read and pass down (the alternative considered), to keep `AdminNav` a self-contained async Server Component and avoid coupling page components to a middleware-internal contract. Accepted trade-off: `/auth/me` is called twice per navigation to a protected screen (once in middleware, once in `AdminNav`) — acceptable given this is a low-traffic internal admin tool in its foundation phase.

**Logout is a Server Action, mirroring `login`.** Consistent with `admin/data-fetching`'s existing requirement that mutations (including authentication) go through Server Actions, not client-side `fetch`.

## Risks / Trade-offs

- [Duplicate `/auth/me` calls per protected-page navigation (middleware + `AdminNav`)] -> Accepted for now; if latency becomes a concern, revisit passing identity from middleware via a header.
- [Middleware makes a network call to the backend on every navigation to a matched route] -> Same cost model `resolveIdentity` already pays per-request today; no new backend load pattern, just a second consumer of it.
- [Middleware's direct `fetch` to `/auth/me` duplicates cookie-forwarding logic that `backendFetch` already encapsulates for server-side code] -> Accepted: middleware's Edge runtime constraints make sharing that helper impractical; the duplicated logic is a single header forward, not the full `backendFetch`/`applySetCookie` surface.
