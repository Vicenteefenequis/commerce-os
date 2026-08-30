## Why

Every admin screen (`login`, `venues`, `products`, `resources`) is a whole-page Client Component that fetches its data in `useEffect` against the `/api/*` route handlers, even though the backend is already reachable server-side via `backendFetch`. This adds an unnecessary client round-trip (mount → fetch → setState → re-render) for pure reads, causes loading-state flicker, and drifts from the `nextjs-frontend-conventions` skill's existing rule that Server Components are the default and `"use client"` belongs only on the smallest leaf. There is currently no formal, enforceable policy distinguishing when server-side data loading is required versus when client-side fetching is acceptable.

## What Changes

- Establish a formal policy: reads (list/detail data) are loaded server-side in Server Components via `backendFetch`, not via client `useEffect` + `/api/*`.
- Establish a formal policy: writes (create/update/delete, login) go through Next.js Server Actions (`"use server"`), not `fetch("/api/*")` from a Client Component.
- `"use client"` is scoped to leaf components that own interactive state (dialogs, forms, toasts) and receive data via props — never a whole page.
- After a Server Action mutation, the affected data is revalidated (`revalidatePath`) rather than the client re-fetching and re-setting state.
- The `/api/*` route handlers (`auth/login`, `venues`, `products`, `resources`) stop being the data channel for these pages; they are removed unless needed for a use case outside the React tree (none identified currently).
- Refactor `login`, `venues`, `products`, `resources` pages to this pattern.
- **BREAKING**: `/api/auth/login`, `/api/venues`, `/api/products`, `/api/resources` route handlers are removed — nothing outside these pages currently depends on them, but any external caller of those URLs would break.

## Capabilities

### New Capabilities
- `admin/data-fetching`: defines the server-first data loading and mutation policy for `apps/web` — when Server Components/Server Actions are required, when a Client Component leaf is acceptable, and how revalidation after a mutation works.

### Modified Capabilities
(none — no existing capability spec currently governs data-fetching placement; `admin/design-system` covers visual/behavioral consistency, not where fetches happen)

## Impact

- Affected code: `apps/web/app/login/page.tsx`, `apps/web/app/venues/page.tsx`, `apps/web/app/products/page.tsx`, `apps/web/app/resources/page.tsx`, `apps/web/app/api/auth/`, `apps/web/app/api/venues/`, `apps/web/app/api/products/`, `apps/web/app/api/resources/`, `apps/web/lib/backend-fetch.ts` (reused, unchanged).
- Affected docs: `.claude/skills/nextjs-frontend-conventions/SKILL.md` gains an explicit Server Actions / data-fetching rule.
- No backend API changes — the backend already exposes the same REST endpoints; only the layer that calls them from `apps/web` changes.
