## Context

`apps/web` already has `backendFetch()`/`proxyResponse()` (`apps/web/lib/backend-fetch.ts`), which forwards the httpOnly session cookie to the backend and is currently called only from `/api/*` route handlers. Those route handlers are in turn called from client-side `fetch` inside whole-page `"use client"` components (`login`, `venues`, `products`, `resources`). See `proposal.md` for why this is being changed.

Backend endpoints involved: `POST /auth/login`, `GET/POST /venues`, `GET/POST /products`, `GET/POST /resources`, plus resource-specific mutations (e.g. capacity update) reached today via `/api/resources/[id]/capacity`.

## Goals / Non-Goals

**Goals:**
- Move all page-level reads to Server Components calling `backendFetch` directly.
- Move all mutations to Server Actions calling `backendFetch` directly.
- Keep the existing visual behavior (design-system requirements in `admin/design-system`) unchanged — this is a data-flow refactor, not a UI redesign.

**Non-Goals:**
- Changing backend REST contracts (`/venues`, `/products`, `/resources`, `/auth/login` stay as-is).
- Introducing client-side caching/SWR-style revalidation — `revalidatePath` + Server Component re-render is sufficient at this scale.
- Streaming/suspense boundaries — not required by current scope; can be added later without changing this policy.

## Decisions

**Server Components call `backendFetch` directly, bypassing `/api/*`.**
`backendFetch` already reads `cookies()` via `next/headers`, which only works in a server context (Server Component, Server Action, Route Handler) — it's already usable directly from a page. Routing through `/api/*` was only ever needed because the *client* needed an HTTP endpoint to call; once the client no longer initiates the fetch, that hop is pure overhead.
Alternative considered: keep `/api/*` and have Server Components `fetch` them internally (same-origin). Rejected — adds a redundant network hop within the same process for no benefit.

**Mutations become Server Actions (`"use server"`), not Route Handlers called from the client.**
A Server Action can be passed as a form `action` or invoked from an event handler in a Client Component leaf, run `backendFetch`, and call `revalidatePath` before returning — one function replaces route handler + client `fetch` + manual `router.refresh()`.
Alternative considered: keep POST route handlers, call them via client `fetch`, but add `router.refresh()`. Rejected — this still routes mutation traffic through the browser and violates the same policy as reads; Server Actions remove the client HTTP hop entirely and are the App Router's idiomatic mechanism.

**`/api/auth/login`, `/api/venues`, `/api/products`, `/api/resources` are deleted, not deprecated in place.**
Nothing outside these four pages currently depends on them (confirmed by scanning `apps/web` for other callers of these paths). Keeping unused route handlers around invites drift back to client-side fetching. If a future need for an HTTP endpoint into this data arises (e.g. a webhook or an external client), it can be added deliberately at that time.

**Error/validation handling moves from "parse JSON response in client `fetch`" to "Server Action returns a typed result the Client Component leaf renders".**
The client leaf (form) keeps local state for pending/error UI (`useFormStatus`/`useActionState` or equivalent), fed by the Server Action's return value, not by parsing a `Response` object itself. This preserves the existing `admin/design-system` requirements (inline field errors, in-progress disabling, non-blocking failure) without any client-side `fetch`.

**Capacity update endpoint (`/api/resources/[id]/capacity`) follows the same pattern**: becomes a Server Action alongside the resource create/edit actions, not a special case.

## Risks / Trade-offs

- [Deleting `/api/*` routes is a breaking change for anything calling them directly] → Confirmed via codebase scan that only the four pages being refactored call them; flagged as **BREAKING** in the proposal for visibility.
- [Server Actions co-located with page files can grow large if not organized] → Keep one Server Action per mutation, colocated with the page or in a small `actions.ts` per route segment, consistent with existing file organization under `apps/web/app/<segment>/`.
- [Losing the `/api/*` layer removes a place to add response caching/edge logic later] → Not a current requirement; Server Components can still set `cache`/`revalidate` options on `backendFetch` calls if needed later.

## Migration Plan

1. Add Server Actions for login, venue create, product create, resource create, resource capacity update (calling `backendFetch`, returning typed results, calling `revalidatePath`).
2. Convert `venues`, `products`, `resources`, `login` pages: page-level component becomes a Server Component that calls `backendFetch` for its list data and passes it as props; existing dialogs/forms become the client leaves, wired to the new Server Actions instead of `fetch("/api/...")`.
3. Remove `apps/web/app/api/auth/`, `apps/web/app/api/venues/`, `apps/web/app/api/products/`, `apps/web/app/api/resources/` route handlers once their pages no longer call them.
4. Update `.claude/skills/nextjs-frontend-conventions/SKILL.md` with the explicit Server Actions / server-first data-loading rule so the policy is enforced going forward, not just for this refactor.
5. No rollback complexity beyond normal git revert — no data migration, no backend change.
