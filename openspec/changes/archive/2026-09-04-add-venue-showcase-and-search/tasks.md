## 1. Venue profile data model

- [x] 1.1 Add migration for new Venue columns (`description`, `address`, `city`, `category` text, all nullable; `coverPhotoUrl` text, nullable; `published` boolean, default `false`) and verify it runs cleanly up and down
- [x] 1.2 Extend `VenueProps`/`Venue` entity with the new optional fields and getters, keeping `create()` defaults (`published: false`, profile fields unset) and verify `venue.entity.test.ts` covers the defaults
- [x] 1.3 Extend `venue-repository.kysely.ts` to persist and hydrate the new columns and verify a round-trip (create/read) test passes

## 2. Update-venue backend capability

- [x] 2.1 Add an `update-venue` use case that lets an authorized actor within the Venue's Organization set `description`, `address`, `city`, `category`, `coverPhotoUrl` (validated as well-formed URL when present) and verify unit tests cover valid updates, malformed URL rejection, and cross-tenant rejection (spec: foundation/venue - "Venue profile fields are owner-editable")
- [x] 2.2 Add a `publish-venue` (or fold into `update-venue`) operation to set `published` independently and verify a unit test toggles it true/false (spec: foundation/venue - "Venue publish toggle is owner-controlled")
- [x] 2.3 Wire both operations into `venue.routes.ts`/`venue.controller.ts` behind existing authorization and verify a route test for success and for a cross-tenant actor being denied

## 3. Admin venue-edit screen

- [x] 3.1 Add an edit action/form to `admin/venues` (fields: description, address, city, category, cover photo URL, publish toggle) calling the update-venue endpoint, and verify by editing a venue in the running admin UI and confirming the values persist on reload
- [x] 3.2 Show `published` state in the venues list/table and verify it reflects the toggle after saving

## 4. Storefront showcase page

- [x] 4.1 Add a public read (route/use case) returning a Venue's profile by tenant slug + venue slug, tenant-isolated, and verify a route test covers found, not-found tenant, and not-found venue (spec: storefront/showcase - "not-found state", "isolated by tenant")
- [x] 4.2 Add `apps/web/app/vitrine/[tenantSlug]/[venueSlug]/page.tsx` rendering name, category, city, address, description, cover photo (each omitted when unset) with a "Comprar ingressos" CTA linking to `/loja/[tenantSlug]/[venueSlug]`, and verify by loading the page for a venue with a full profile and for one with fields unset (spec: storefront/showcase - "renders a venue's profile", "omitted, not shown as errors", "links to the purchase flow")
- [x] 4.3 Verify the showcase page loads for an unpublished Venue via direct link (spec: storefront/showcase - "reachable regardless of publish status")

## 5. Discovery backend capability

- [x] 5.1 Add a cross-tenant `list-discoverable-venues` use case implementing the eligibility rule (`published = true` AND `coverPhotoUrl` set AND >=1 Product with `isVisibleOnChannel('storefront')` && `isAvailableAt(now)`), as a distinct read path from the tenant-scoped storefront reads, and verify unit tests cover each exclusion scenario individually (spec: storefront/discovery - "Discovery eligibility rule")
- [x] 5.2 Add `city` and `category` filter params to the use case and verify unit tests for city-only, category-only, combined, and no-match-returns-empty (spec: storefront/discovery - "filters by city and category")
- [x] 5.3 Expose the use case via a new public route (e.g. `GET /storefront/discovery/venues`) returning name, category, city, coverPhotoUrl, and tenant/venue slugs for the showcase link, and verify a route test against the same scenarios

## 6. Discovery search page

- [x] 6.1 Add `apps/web/app/busca/page.tsx` with city and category filter controls reading/writing the URL's search params (per nextjs-frontend-conventions), calling the discovery endpoint, and verify by searching with no filter, city-only, category-only, and a combination that returns no results
- [x] 6.2 Render each result as a card (photo, name, category, city) linking to `/vitrine/[tenantSlug]/[venueSlug]` and verify clicking a card navigates to that venue's showcase page (spec: storefront/discovery - "results link to the showcase page")

## 7. End-to-end verification

- [x] 7.1 Walk the full path in the running app: publish a venue with a photo and an active product in admin -> confirm it appears in `/busca` -> open its showcase page -> follow the CTA into `/loja/...` -> complete checkout, and verify each step matches its spec scenario
- [x] 7.2 Confirm an unpublished venue (or one missing a photo/active product) is absent from `/busca` but its showcase and loja links still load directly
