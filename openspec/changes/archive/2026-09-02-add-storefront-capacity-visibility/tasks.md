## 1. Availability fetching

- [x] 1.1 In `page.tsx`, read `date` from `searchParams` (default: today), and for every variant across `products` with `resourceId !== null`, fetch `GET /storefront/variants/:tenantId/:variantId/availability?period=<date>` in parallel via plain `fetch(backendUrl(...))` (matching the existing venues/products fetches). Build an `availability: Record<variantId, { constrained: boolean; availableCapacity: number | null }>` map and pass it, plus the resolved `date`, down to `CheckoutCart` as props. Verify: manual check in dev tools network tab shows one request per capacity-bound variant per page load/date change, none for unconstrained variants.
- [x] 1.2 On fetch failure for a variant, omit it from the `availability` map so it renders without a capacity figure and with its input enabled (matches current no-limit behavior). Verify: simulate a failed fetch (e.g. temporarily point at a bad URL) and confirm the row renders normally with no crash.
- [x] 1.3 Wire `CheckoutCart`'s date `Input.onChange` to push the new `date` onto the URL query string (`router.push` with `{ scroll: false }`, only once the typed value is a complete `YYYY-MM-DD`), instead of only local state, and use `useTransition` to track the pending navigation. Verify: manual check - changing the date updates the URL and the page's availability figures, and previously-entered quantities are preserved (per "Changing the visit date preserves selected quantities").

## 2. Remaining-capacity display and quantity cap

- [x] 2.1 Show the fetched remaining capacity next to each capacity-bound variant's quantity input (e.g. "8 vagas restantes"), and a loading indicator while a date-change navigation is pending. Verify: manual check in the storefront cart with a capacity-bound variant.
- [x] 2.2 Set the quantity `Input`'s `max` to the variant's remaining capacity and clamp `setQuantity` so it cannot exceed it, for capacity-bound variants only. Verify: unit/component test or manual check that typing a value above remaining capacity is capped.
- [x] 2.3 Mark a capacity-bound variant with zero remaining capacity as sold out and disable its quantity input. Verify: manual check with a variant/date combination that has zero remaining capacity (or a test double for the availability fetch).

## 3. Stale-selection handling

- [x] 3.1 When a date change lowers a capacity-bound variant's remaining capacity below its already-selected quantity, keep the quantity but show an inline warning on that line instead of clamping it silently. Verify: manual check - select a quantity, change the date to one with lower capacity, confirm the warning appears and the quantity is unchanged.

## 4. Spec verification

- [x] 4.1 Run `openspec validate add-storefront-capacity-visibility --strict` and confirm it passes.
- [x] 4.2 Confirm each scenario in `specs/storefront/checkout/spec.md` (this change) has a corresponding manual or automated check performed above.
