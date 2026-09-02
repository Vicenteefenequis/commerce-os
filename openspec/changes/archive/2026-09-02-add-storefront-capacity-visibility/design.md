## Context

`checkout-cart.tsx` (see proposal.md - Impact) is a Client Component that already holds `visitDate` and `cart` state. `GET /storefront/variants/:tenantId/:variantId/availability?period=<date>` (storefront/catalog, already shipped) returns `{ variantId, constrained, availableCapacity }` per variant; `availableCapacity` is `null` when unconstrained. There is no existing client-side data-fetching hook in this file - all current fetches happen server-side in `page.tsx`.

## Goals / Non-Goals

**Goals:**
- Show remaining capacity per capacity-bound variant for the selected date, refreshed on every date change.
- Prevent submitting a quantity the backend would reject for capacity reasons, without duplicating the backend's capacity math.

**Non-Goals:**
- No change to the checkout API or the capacity calculation itself - this only surfaces the existing figure earlier.
- No optimistic/real-time updates while other consumers are also booking; a fetched figure is a snapshot as of the last date change, same staleness class the checkout endpoint itself accepts today (it still validates at submission).

## Decisions

- **Move the visit date into the URL (`?date=YYYY-MM-DD` on `/loja/[tenantId]/[venueId]`) and fetch availability server-side in `page.tsx`, not client-side.** `nextjs-frontend-conventions` requires page reads to happen in the Server Component and explicitly covers this exact shape: "a per-user selection that changes what a page shows... belongs in the URL's search params... the Client Component leaf navigates (`router.push`) to update it, and the Server Component re-fetches with the new value." Before this change the visit date lived in `CheckoutCart`'s local client state (from M12.2) because nothing server-derived depended on it; M12.3 makes availability depend on it, so it now falls under that rule. Alternative considered (a client-side `useEffect` firing one fetch per variant on date change) was the original plan in this file but violates "Never fetch page data in a `useEffect`... from a Client Component" - superseded by this decision.
- **`page.tsx` reads `searchParams.date` (default: today), fetches `GET /storefront/variants/:tenantId/:variantId/availability?period=<date>` in parallel for every variant with `resourceId !== null` (same check `checkout-cart.tsx` already uses to decide whether to send a `period`), and passes an `availability: Record<variantId, { constrained, availableCapacity }>` map plus `visitDate` down to `CheckoutCart` as props.** Uses the same plain `fetch(backendUrl(...))` pattern `page.tsx` already uses for venues/products (not `backendFetch`, which forwards the session cookie - storefront reads are public/cookieless, matching `storefront.routes.ts`'s "no requireAuth" comment).
- **`CheckoutCart`'s date `Input.onChange` calls `router.push` with the updated `date` query param** (via `useSearchParams`/`usePathname`, `{ scroll: false }`) instead of only `setState`. The component keeps its own `cart` (quantities) state untouched by this navigation - same client component instance, so React preserves it, satisfying "Changing the visit date preserves selected quantities" (storefront/checkout, existing requirement) without extra bookkeeping.
- **Cap the quantity input's `max` at `availableCapacity`** and clamp `setQuantity` to that ceiling for capacity-bound variants, rather than only validating on submit. This is a UI-level clamp, not a new source of truth - the checkout endpoint remains the enforcement point.
- **On a date change that drops remaining capacity below an already-selected quantity, keep the selected quantity but flag the line** (inline warning) instead of silently clamping it down - clamping would silently discard the consumer's stated intent when they're mid-adjustment; flagging matches the existing `storefront/checkout` pattern of surfacing capacity problems rather than hiding them (see "Storefront checkout surfaces checkout failures without losing the consumer's input").
- **A pending navigation (via `useTransition`) shows a brief loading state on the affected rows**; a fetch failure for a given variant (caught in `page.tsx`) leaves that variant unconstrained-looking (no figure, input enabled) rather than breaking the page - the checkout endpoint still enforces capacity as the backstop, so a lookup failure degrades to today's behavior.

## Risks / Trade-offs

- [N variants each firing a request on every date change] → acceptable: storefront product lists are small (single-venue offerings), and this mirrors the granularity the existing endpoint already offers.
- [Fetched figure can go stale between lookup and submission if another consumer books in between] → unchanged risk, already handled by the checkout endpoint's own capacity check at submission time; this change only makes the common case visible earlier, it doesn't replace that check.
- [Every date keystroke on a native `<input type="date">` can fire multiple `onChange` events before the value is a complete date] → mitigate by only pushing the URL update when the input's value parses as a complete `YYYY-MM-DD` string (same guard the date input already implicitly relies on for `period`).
