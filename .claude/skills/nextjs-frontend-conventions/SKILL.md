---
name: nextjs-frontend-conventions
description: Next.js App Router conventions for apps/web — Server Components default, typed API-client boundary, accessibility, composition. Use whenever adding or modifying code under apps/web.
---

## Server vs Client Components

- Server Components are the default. Add `"use client"` only to the
  smallest possible leaf component that genuinely needs state, event
  handlers, or a browser-only API — never to a whole page because one child
  needs it.

## Data fetching

Server-side is the default and required path for talking to the backend; client-side is the exception, used only where it doesn't fit the rules below (see `openspec/specs/admin/data-fetching/spec.md`).

- **Reads** (list/detail data for a page): fetch in the page's Server
  Component via `backendFetch` (`apps/web/lib/backend-fetch.ts`), and pass
  the result down as props. Never fetch page data in a `useEffect` or on
  mount from a Client Component.
- **Writes** (create/update/delete, login): use a Server Action
  (`"use server"`) that calls `backendFetch` and, on success, calls
  `revalidatePath` for the affected page. Never call `fetch("/api/...")`
  from a Client Component to perform a mutation.
- `"use client"` stays scoped to the leaf that owns interactive state
  (a dialog, a form, a toast). That leaf receives its data via props from
  the Server Component parent — it does not fetch its own initial data —
  and calls Server Actions imported from a co-located `actions.ts` for any
  mutation.
- A per-user selection that changes what a page shows (e.g. which venue's
  data to list) belongs in the URL's search params, not client state — the
  Client Component leaf navigates (`router.push`) to update it, and the
  Server Component re-fetches with the new value. This avoids a client
  fetch on every selection change.
- Next.js `/api/*` route handlers are not the data channel for pages —
  don't add one to serve a Server Component or Server Action; call
  `backendFetch` directly instead. Reserve `/api/*` for endpoints that
  must be reachable by something outside the React tree (e.g. a webhook).
- `ApiError` carries `code`/`requestId`/`status` from the backend's error
  envelope — surface `code`, not raw `message`, when branching on error
  type.

## Routing

- Every public URL segment (static folder names and the *values* a dynamic
  segment can take — e.g. an `[node]` param driving an `edit/{node}` route)
  MUST be kebab-case. A route param sourced from a camelCase identifier
  (like an internal `NodeKey`) must be kebab-cased before it reaches the
  URL, not passed through as-is.

## Scope discipline

No speculative product screens or dashboards. This is a foundation-phase
shell — build only what's explicitly asked for.

## Accessibility

- Every interactive element needs visible `:focus-visible` styling (already
  global in `globals.css`) and a semantic label.
- Keep the skip-link in the root layout ahead of the header.

## Composition

Prefer composing small components over one component controlled by many
boolean props.

## Secrets

Only `NEXT_PUBLIC_*`-prefixed env vars may reach the client bundle. Never
assume an unprefixed var stays server-only "because it's not used in a
client component" — verify the import chain.

## Required scripts

Every app under `apps/*` must expose `typecheck`, `lint`, `test`, `build`
npm scripts with those exact names — the root `Makefile` assumes them.
