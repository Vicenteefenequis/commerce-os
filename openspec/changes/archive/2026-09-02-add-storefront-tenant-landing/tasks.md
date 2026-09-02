## 1. Schema

- [x] 1.1 Migration: add nullable `slug text` to `organizations` (unique index) and to `venues` (unique composite index on `tenant_id, slug`); verify migration runs clean against a fresh DB (`npm run migrate` or project equivalent)
- [x] 1.2 Backfill script/migration: derive a kebab-case, ASCII-folded slug from `name` for every existing `organizations` and `venues` row, disambiguating collisions with a numeric suffix; verify every existing row has a non-null, unique-within-scope slug after running it
- [x] 1.3 Migration: set both `slug` columns `NOT NULL`; verify it fails loudly if any row is still null (i.e. backfill ran first)

## 2. Backend — Organization & Venue creation

- [x] 2.1 Update `organization` domain entity, create-use-case, and repository to accept/generate and persist `slug`; verify `create-organization.usecase.test.ts` covers a generated slug and a rejected duplicate-slug submission
- [x] 2.2 Update `venue` domain entity, create-use-case, and repository to accept/generate and persist `slug`, unique within `tenant_id`; verify `create-venue.usecase.test.ts` covers a generated slug, a rejected duplicate within the same org, and an accepted duplicate across two different orgs
- [x] 2.3 Update `organization.controller.ts`/`organization.routes.ts` and `venue.controller.ts`/`venue.routes.ts` request/response shapes for the new `slug` field; verify existing route tests still pass with `slug` included

## 3. Backend — Storefront slug-keyed routes

- [x] 3.1 Add `list-storefront-venues` (or extend existing use case) to resolve a tenant by slug before listing Venues; verify a unit test covers unknown-slug returning not-found
- [x] 3.2 Update `list-storefront-products.usecase.ts` to resolve tenant slug + venue slug before listing Products; verify existing channel/availability-window tests still pass under slug resolution, plus a new unknown-venue-slug not-found test
- [x] 3.3 Update `get-storefront-variant-availability.usecase.ts` to resolve tenant slug + venue slug; verify existing availability tests still pass under slug resolution
- [x] 3.4 Add `GET /storefront/tenants/:tenantSlug`, `GET /storefront/tenants/:tenantSlug/venues`, `GET /storefront/tenants/:tenantSlug/venues/:venueSlug/products`, `GET /storefront/tenants/:tenantSlug/venues/:venueSlug/variants/:variantId/availability` to `storefront.routes.ts`, each response including the resolved tenant/venue UUIDs; remove the old UUID-keyed public storefront routes; verify `storefront.routes.test.ts` is updated and passing for the new routes and no longer references the removed ones

## 4. Frontend — Tenant landing page

- [x] 4.1 Add `apps/web/app/loja/[tenantSlug]/page.tsx`: server-rendered list of the tenant's Venues from `GET /storefront/tenants/:tenantSlug/venues`, each linking to `/loja/[tenantSlug]/[venueSlug]`; verify it renders the tenant name and venue links for a seeded tenant
- [x] 4.2 Handle unknown tenant slug and zero-venue tenant with clear messages (not a blank/broken page); verify both states render manually against a nonexistent slug and an empty-venue tenant

## 5. Frontend — Venue page route rename

- [x] 5.1 Move `apps/web/app/loja/[tenantId]/[venueId]` to `apps/web/app/loja/[tenantSlug]/[venueSlug]`, fetching from the new slug-keyed products endpoint; verify the page renders the same product list as before for a seeded venue
- [x] 5.2 Update `checkout-cart.tsx`/`actions.ts` to source the tenant/venue UUIDs for `POST /checkout` from the fetched product-listing response instead of route params; verify an end-to-end checkout (cart -> `/pay/[orderId]`) still succeeds through the renamed route

## 6. Admin — Slug input on creation forms

- [x] 6.1 Add a slug input (auto-suggested from name, editable, client-validated as kebab-case) to the Venue creation form (`apps/web/app/admin/venues/venues-content.tsx`); verify creating a venue in the UI produces the expected slug and a duplicate submission surfaces the server's rejection
- [x] 6.2 N/A: no Organization bootstrap/signup form exists in `apps/web` (no frontend code calls `POST /organizations`) — matches design.md's own Non-Goal ("Any Organization admin/settings screen - still doesn't exist after this change"). Organization creation still only happens via the API directly (`POST /organizations`), which already accepts/generates `slug` (task 2.1/2.3). Confirmed with the user 2026-09-02.

## 7. Verification

- [x] 7.1 Manual end-to-end pass: created an Organization with two Venues (`zoo-manual-test` with `savana-africana`/`aquario`, and a single-venue `zoo-single-venue`/`unica-sede`) and a Product/Variant, then against a running backend+web dev server: visited `/loja/zoo-manual-test` (venue list + org name render), `/loja/zoo-single-venue` (307 redirect straight to its one venue), `/loja/does-not-exist` (clear not-found message), and the venue product page (org/venue name, empty-catalog state); drove `POST /checkout` -> `POST /orders/:id/submit-for-payment` with the exact tenantId/venueId the page now sources from the product-listing response (not route params) and confirmed both succeed. Payment/ticketing/access-control code is unchanged by this change (proposal.md Impact) and its own test suite passes unmodified - not re-driven through a real Stripe payment in this pass.
- [x] 7.2 Full backend suite (`vitest run`, serial to rule out pre-existing outbox-processing test parallelism flakes): 267/268 passing, only failure is `RESEND_API_KEY` being set in the local `.env` causing a real send attempt instead of the expected `not_configured` stub - pre-existing, unrelated to this change. `tsc --noEmit` clean on both apps. Frontend has no unit test suite in this repo; `eslint .` clean (one pre-existing unrelated warning in `app/pay/[orderId]/ticket-viewer.tsx`).
