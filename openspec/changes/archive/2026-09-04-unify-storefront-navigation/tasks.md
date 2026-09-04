## 1. Backend: tenant discovery search

- [x] 1.1 Add a name-normalization helper (lowercase, strip diacritics via Unicode NFD) and unit-test it against "bar do joao" -> matches "Bar do João"
- [x] 1.2 Implement `ListDiscoverableTenantsUseCase` using `OrganizationRepositoryPort.listAll()`, the tenant discovery eligibility rule (at least one Venue: `published=true`, `coverPhotoUrl` set, and a Product visible on `storefront` and available now), and the normalized-name match; verify with a unit test covering an eligible match, an ineligible tenant (no qualifying venue), and a no-match query returning an empty result without error
- [x] 1.3 Add `GET /storefront/discovery/tenants?q=` route wired to the new use case, returning tenant slug, name, and a link target; verify with an integration test hitting the route
- [x] 1.4 Remove `ListDiscoverableVenuesUseCase` and the `GET /storefront/discovery/venues` route, and delete their tests; verify no remaining references (`grep -r "discovery/venues\|ListDiscoverableVenuesUseCase" apps/backend`)

## 2. Backend: defer Order creation to the payment step

- [x] 2.1 Identify the current storefront checkout use case invoked by `submitCheckout` (`apps/web/app/loja/[tenantSlug]/[venueSlug]/actions.ts`) and confirm which of its inputs are cart-only (items, quantity, visit date) vs. buyer-only (name, email)
- [x] 2.2 Split Order creation so it accepts buyer name/email as required inputs and is only invoked once both cart selection and buyer details are available (per design.md "Order creation moves to the payment step"); verify with a unit/integration test that Order creation fails fast without buyer details
- [x] 2.3 Define how the cart selection survives the redirect from the cart step to the payment step (e.g. short-lived server-side cart token or signed query params) without creating an Order yet; verify with a test that an abandoned cart (never reaching payment) leaves no Order record
- [x] 2.4 Update or remove any code/admin tooling that assumed an Order exists immediately after cart submission (per design.md Risk); verify by searching for usages of the old `submitCheckout` Order-creation contract (`grep -rn "submitCheckout" apps/web apps/backend`)

## 3. Frontend: home tenant search entry point

- [x] 3.1 Add a tenant search input to `apps/web/app/(marketing)/page.tsx`, calling `GET /storefront/discovery/tenants`, alongside the existing B2B sections; verify it renders without disrupting the Hero/Como Funciona/Diferencial/FAQ/CTA order
- [x] 3.2 Verify the search input remains visible and usable below the tablet breakpoint (matches the header's existing collapsed-nav responsive pattern)
- [x] 3.3 Wire a selected search result to navigate to `/loja/[tenantSlug]`; verify by selecting a result and landing on that tenant's entry page

## 4. Frontend: remove /busca

- [x] 4.1 Delete `apps/web/app/busca/page.tsx` and `apps/web/app/busca/search-filters.tsx`; verify `/busca` returns Next.js's standard 404
- [x] 4.2 Grep the app for any remaining reference to `/busca` or the old discovery-by-venues fetch and remove it (`grep -rn "/busca\|discovery/venues" apps/web`)

## 5. Frontend: /vitrine becomes a redirect

- [x] 5.1 Replace `apps/web/app/vitrine/[tenantSlug]/[venueSlug]/page.tsx`'s content with a permanent (308) redirect to `/loja/[tenantSlug]/[venueSlug]`; verify a request to an existing `/vitrine/...` URL redirects with the same tenant/venue slugs preserved
- [x] 5.2 Verify an unknown tenant/venue slug under `/vitrine/...` still resolves to the same not-found behavior as `/loja/...` after the redirect (not a separate error)

## 6. Frontend: richer venue picker on /loja/[tenantSlug]

- [x] 6.1 Update `apps/web/app/loja/[tenantSlug]/page.tsx`'s multi-venue list to render cards with cover photo, address, and category (fetch fields already available from `GET /storefront/tenants/:tenantSlug/venues`, extend if needed); verify a tenant with 2+ venues shows populated cards
- [x] 6.2 Verify a venue missing photo/address/category omits that field without an error or placeholder
- [x] 6.3 Verify responsive layout: card grid on desktop, stacked single-column cards on mobile
- [x] 6.4 Confirm the single-venue auto-redirect behavior is unchanged (still skips the picker)

## 7. Frontend: merge showcase into the cart step

- [x] 7.1 Port the profile-rendering logic (name, category, city, address, description, cover photo, unset-field omission, not-found state) from `apps/web/app/vitrine/[tenantSlug]/[venueSlug]/page.tsx` into `apps/web/app/loja/[tenantSlug]/[venueSlug]/page.tsx`, rendered above the ticket-selection UI; verify by loading a venue with a full profile and one with several fields unset
- [x] 7.2 Verify the merged page still loads for an unpublished venue via direct link (profile content renders normally)
- [x] 7.3 Replace the cart's bottom-of-form total with a footer bar fixed to the viewport bottom that updates live as quantities change; verify by changing a quantity and observing the footer update without scrolling
- [x] 7.4 Implement the single-option smart default: when a venue has exactly one ticket variant not tied to a bookable Resource, pre-select quantity 1 and hide the visit-date field, while keeping the quantity editable; verify with a venue fixture matching that shape and one that doesn't (date field still shows)
- [x] 7.5 Remove the name/email fields from `checkout-cart.tsx`; verify the cart step no longer renders or requires them, and that `submitCheckout` no longer errors on their absence
- [x] 7.6 Verify responsive layout: profile + ticket list stacked as sections on both desktop and mobile (no bottom sheet), fixed footer total visible at both breakpoints without overlapping content

## 8. Frontend: buyer details on the payment step

- [x] 8.1 Add a name/email step to `apps/web/app/pay/[orderId]/pay-form.tsx` (or the pre-payment page that now creates the Order, per design.md), gating the `select_method` phase until both fields are filled; verify the payment method selector is disabled/hidden until name and email are present
- [x] 8.2 Wire the entered buyer details into Order creation (task 2.2) before `createPaymentIntent` is called; verify end-to-end that an Order is created only after buyer details are submitted
- [x] 8.3 Verify the final payment button reflects the real calculated total immediately (carried from the cart selection), not "R$ 0,00" before interaction

## 9. Verification

- [x] 9.1 Run the full path end-to-end manually: `/` search -> tenant with 1 venue -> merged page -> payment with buyer details -> success; and `/` search -> tenant with 2+ venues -> picker -> merged page -> payment -> success
- [x] 9.2 Verify the direct-link entry point still works: open `/loja/[tenantSlug]` (or a shared `/vitrine/...` link) without going through home search
- [x] 9.3 Run `openspec validate unify-storefront-navigation --strict` and the project's existing test suite; fix any failures before archiving
