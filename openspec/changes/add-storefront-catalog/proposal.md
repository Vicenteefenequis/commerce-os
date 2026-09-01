## Why

Every existing catalog/venue/availability read endpoint requires `requireAuth` + a staff `*:read` permission (`apps/backend/src/modules/catalog/infrastructure/product.routes.ts`, `apps/backend/src/modules/capacity/infrastructure/resource.routes.ts`, `apps/backend/src/modules/venue/infrastructure/venue.routes.ts`). A consumer has no way to see what a tenant sells before calling `POST /checkout`, which blocks the public storefront checkout UI (M8) entirely - this is its hard prerequisite.

## What Changes

- Add `GET /storefront/venues/:tenantId` (public, no `requireAuth`): lists a tenant's Venues.
- Add `GET /storefront/venues/:tenantId/:venueId/products` (public): lists Products visible on the `storefront` channel and within their availability window, with variant id/name/price.
- Add `GET /storefront/variants/:tenantId/:variantId/availability?period=` (public): available capacity for a resource-backed variant, reusing the existing `GetAvailableCapacityUseCase`; reports "no constraint" for variants without a `resourceId`.

## Capabilities

### New Capabilities

- `storefront/catalog`: unauthenticated read access to a tenant's storefront-visible venues, products, prices, and resource availability - the minimum a consumer needs to browse before buying.

## Impact

- Backend: new `apps/backend/src/modules/storefront` module (public read endpoints only, no domain layer - composes existing `ProductRepositoryPort`, `VenueRepositoryPort`, `GetAvailableCapacityUseCase`; no new tables). Registered in `apps/backend/src/http/app.ts`.
- No changes to `catalog/product`, `capacity/resource`, or `foundation/venue` behavior - this is a new, narrower public read surface in front of capabilities that already exist and are fully specified.
- Unblocks M8 (`add-storefront-checkout-ui`), which depends on this change.
