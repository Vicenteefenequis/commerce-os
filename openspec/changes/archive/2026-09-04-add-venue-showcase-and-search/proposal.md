## Why

Today a Venue's only public surface is `/loja/[tenantSlug]/[venueSlug]`, a bare product-and-checkout screen reachable only if someone already has the link. There is no page that presents a venue (photos, description, location) before asking for money, and no way for a consumer to discover venues they don't already have a link to. This blocks a marketplace-style discovery flow ("where do I buy tickets for X") on top of the existing multi-tenant storefront.

## What Changes

- Add profile fields to Venue: `description`, `address`, `city`, `category` (free text), `coverPhotoUrl` (an externally-hosted image URL, no upload pipeline), and `published` (boolean, owner-controlled).
- Add a Venue-edit screen under `admin/venues` (today only creation exists) so an owner can set these fields and the `published` toggle.
- Add a new public showcase page `/vitrine/[tenantSlug]/[venueSlug]` presenting the venue's profile (photo, name, category, city/address, description) with a call-to-action linking to the existing `/loja/[tenantSlug]/[venueSlug]` purchase flow. The showcase page is reachable by direct link regardless of `published`.
- Add a new public search page (`/busca`) and a backing public listing endpoint that lists venues across all tenants, filterable by `city` and `category`, linking each result to its showcase page.
- Define search eligibility: a Venue appears in search results only when `published = true`, `coverPhotoUrl` is set, and it has at least one Product visible on the `storefront` channel and within its availability window (reusing the existing product-visibility rule from `storefront/catalog`).

## Capabilities

### New Capabilities
- `storefront/showcase`: public, account-less venue profile page at `/vitrine/[tenantSlug]/[venueSlug]`, reachable by direct link independent of publish status, linking onward to the purchase flow.
- `storefront/discovery`: public, cross-tenant venue search — listing endpoint and page, filterable by city/category, scoped to venues meeting the publish + eligibility rule.

### Modified Capabilities
- `foundation/venue`: adds owner-editable profile fields (`description`, `address`, `city`, `category`, `coverPhotoUrl`, `published`) and an update operation; existing creation/tenant-isolation requirements are unchanged.

## Impact

- Backend: `venue.entity.ts` gains new optional profile props; new update-venue use case and route; new public storefront-discovery use case/route (cross-tenant read, unlike every other storefront read which is tenant-scoped).
- Frontend (`apps/web`): `admin/venues` gains an edit form; new `app/vitrine/[tenantSlug]/[venueSlug]` route; new `app/busca` route.
- No new infrastructure (no image storage/upload service) - `coverPhotoUrl` is a validated text field.
- First cross-tenant public read in the system - `storefront/discovery` intentionally breaks the "storefront reads are isolated by tenant" pattern used everywhere else in `storefront/*`, and must not be confused with it.
