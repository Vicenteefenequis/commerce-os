## 1. Tenant entry page

- [x] 1.1 Create `apps/web/app/loja/[tenantId]/page.tsx` as a server component that fetches `GET /storefront/venues/:tenantId` and verify it renders for an existing tenant with venues
- [x] 1.2 When the fetch returns exactly one Venue, redirect (server-side, `next/navigation` `redirect()`) to `/loja/[tenantId]/[venueId]` and verify a single-venue tenant lands on the venue page with no picker flash
- [x] 1.3 When the fetch returns two or more Venues, render a list of venue names linking to `/loja/[tenantId]/[venueId]` and verify the links navigate correctly
- [x] 1.4 When the fetch returns zero Venues (unknown tenant or tenant with none), render a "not found" message and verify no error is thrown and no blank page is shown

## 2. Verification

- [x] 2.1 Manually exercise all three cases (zero, one, multiple venues) against the running backend and confirm each matches its spec scenario in `specs/storefront/tenant-entry/spec.md`
- [x] 2.2 Run the web app's existing lint/typecheck/test commands and verify they pass with the new page included

## 3. Business identity and variant clarity (found during manual testing)

- [x] 3.1 `listStorefrontVenuesController` also reads the Organization and returns `organizationName` alongside `venues`; verify via manual request that the field is present and correct
- [x] 3.2 Tenant entry page shows the organization name as its heading when listing multiple venues; verify against a multi-venue tenant
- [x] 3.3 Venue product page (`[tenantId]/[venueId]/page.tsx`) shows the organization name above the venue name; verify visually
- [x] 3.4 Each product renders as its own card with its variants listed with clearer name/price hierarchy (still the same cart behavior); verify against a product with two variants (e.g. "Meia"/"Inteira")
