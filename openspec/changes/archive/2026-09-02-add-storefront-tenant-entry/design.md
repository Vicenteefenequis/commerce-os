## Context

`apps/web/app/loja/[tenantId]/[venueId]/page.tsx` already renders a Venue's storefront (server component, calls `GET /storefront/venues/:tenantId` and `GET /storefront/venues/:tenantId/:venueId/products`). There is no `apps/web/app/loja/[tenantId]/page.tsx` today, so a bare tenant link 404s. This change adds only that missing entry page; see proposal.md for motivation.

## Goals / Non-Goals

**Goals:**
- One new server-rendered page, following the same pattern as the existing `[venueId]` page (no client state needed here — it's a read-and-route page).
- Establish the routing convention phases 2 and 3 build on: the tenant entry page is purely a router to a single Venue's storefront; it does not itself gain a date picker or product list.

**Non-Goals:**
- No new backend endpoint — reuses `GET /storefront/venues/:tenantId` as-is.
- No tenant branding/logo (name only) — nothing in the current API exposes it, and it's not needed to unblock the flow.
- No change to the multi-venue picker's visual design beyond a plain list; visual polish can follow later if the multi-venue case turns out to matter in practice.

## Decisions

- **Server-side redirect for the single-venue case**, using Next's `redirect()` in the page's server component, rather than a client-side `useEffect` redirect. The venue list is already fetched server-side to decide which case applies, so redirecting from the same server component avoids an extra client round-trip and a flash of the picker.
- **Reuse the existing venues endpoint rather than adding a "get tenant" endpoint.** The page only needs the Venue list to decide picker-vs-redirect; there's no tenant name/branding to show today, so a dedicated tenant-lookup endpoint would have no payload to add over what `GET /storefront/venues/:tenantId` already returns.
- **Not-found vs. empty-venues are the same UI state, different message.** Both are "nothing to route to" outcomes; distinguishing them is one conditional string, not a different component or route.

## Risks / Trade-offs

- [Multi-venue tenants get a bare-bones picker with no branding or venue images] → Acceptable for phase 1; the plan already scopes visual polish out, and today's only real-world tenants are single-venue, so this path is largely untested by actual usage until it matters.
- [No distinct "tenant doesn't exist" vs "tenant exists with 0 venues" signal from the venues endpoint] → Both cases return an empty list from `GET /storefront/venues/:tenantId` (per `storefront/catalog`'s tenant-isolation behavior returning empty rather than erroring for unknown tenants); the page cannot tell them apart and shows one generic not-found message for both, which is acceptable since the consumer's next action (there's nothing to buy here) is the same either way.
