## 1. Storefront catalog API

- [x] 1.1 Create `apps/backend/src/modules/storefront` module skeleton (application/infrastructure folders, no domain layer needed - composes existing ports)
- [x] 1.2 Add `GET /storefront/venues/:tenantId` (public, no `requireAuth`) listing that tenant's Venues; verify with a route test covering tenant isolation
- [x] 1.3 Add `GET /storefront/venues/:tenantId/:venueId/products` (public) returning Products visible on the `storefront` channel and available now (`isVisibleOnChannel("storefront")`, `isAvailableAt(new Date())`), with variant id/name/price; verify with a route test covering: visible+available included, channel-hidden excluded, outside-availability-window excluded
- [x] 1.4 Add `GET /storefront/variants/:tenantId/:variantId/availability?period=` (public) reusing `GetAvailableCapacityUseCase` for resource-backed variants, returning "no constraint" for variants without a `resourceId`; verify with a route test for both cases
- [x] 1.5 Register the new router in `apps/backend/src/http/app.ts`

## 2. Validation

- [x] 2.1 Run backend test suite and confirm no regressions
- [x] 2.2 Update `docs/ROADMAP.md`: mark M7 concluded, reference this change
