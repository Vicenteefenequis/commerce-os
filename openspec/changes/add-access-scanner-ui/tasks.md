## 1. Access scanner UI

- [ ] 1.1 Add `apps/web/app/admin/scan/page.tsx` + content component, server-loading the Venue list per `admin/data-fetching`; add the route to `apps/web/middleware.ts`'s protected matcher; verify an unauthenticated request redirects to login
- [ ] 1.2 Add Venue selector; block scan submission until a Venue is selected; verify the scan control is disabled/hidden with no Venue selected
- [ ] 1.3 Add the scan Client Component leaf: manual code entry input plus camera-based scanning (a barcode/QR reader library reading into the same submit path), calling `POST /access/scan` with `{code, venueId}`; verify both entry paths submit identically
- [ ] 1.4 Render each of the six outcomes (authorized, already used, invalid, wrong venue, wrong time, expired) with a distinct, unambiguous visual state; verify against `access/scan`'s six scenarios using seeded tickets for each outcome
- [ ] 1.5 Reset to ready-to-scan immediately after showing a result, no navigation required; verify by scanning twice in a row without leaving the page
- [ ] 1.6 Add "Scanner" to `apps/web/components/layout/admin-nav.tsx`

## 2. Validation

- [ ] 2.1 Manually verify a second scan of the same ticket shows "already used", and a scan at the wrong Venue shows "local incorreto"
- [ ] 2.2 Update `docs/ROADMAP.md`: mark M9 concluded, reference this change
