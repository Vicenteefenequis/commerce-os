## 1. Tenant entry page

- [ ] 1.1 Create `apps/web/app/loja/[tenantId]/page.tsx` as a server component that fetches `GET /storefront/venues/:tenantId` and verify it renders for an existing tenant with venues
- [ ] 1.2 When the fetch returns exactly one Venue, redirect (server-side, `next/navigation` `redirect()`) to `/loja/[tenantId]/[venueId]` and verify a single-venue tenant lands on the venue page with no picker flash
- [ ] 1.3 When the fetch returns two or more Venues, render a list of venue names linking to `/loja/[tenantId]/[venueId]` and verify the links navigate correctly
- [ ] 1.4 When the fetch returns zero Venues (unknown tenant or tenant with none), render a "not found" message and verify no error is thrown and no blank page is shown

## 2. Verification

- [ ] 2.1 Manually exercise all three cases (zero, one, multiple venues) against the running backend and confirm each matches its spec scenario in `specs/storefront/tenant-entry/spec.md`
- [ ] 2.2 Run the web app's existing lint/typecheck/test commands and verify they pass with the new page included
