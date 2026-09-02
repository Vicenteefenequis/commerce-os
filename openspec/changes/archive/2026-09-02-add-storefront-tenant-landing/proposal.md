## Why

The public storefront only exists at `/loja/[tenantId]/[venueId]` — a buyer must already know a venue's raw UUID to reach it, and there is no page that presents the business itself (its name, its venues/areas) before picking a venue. A multi-venue tenant (e.g. a zoo with "Savana Africana", "Aquário", "Répteis" each modeled as a Venue) has no landing page that lets a customer pick which area to buy a ticket for, and every link a business shares is an unreadable UUID instead of something like `/loja/zoologico-x`.

## What Changes

- Add a `slug` column to `organizations` and to `venues` (unique per tenant), generated at creation time from `name`; no update endpoint is introduced — a slug is fixed once the record is created, matching the existing no-update posture of both entities.
- `POST /organizations` and `POST /venues` accept/generate the slug on creation.
- New public storefront tenant landing route `/loja/[tenantSlug]`: lists the tenant's Venues (the buyer-facing "areas") linking to each venue's existing product listing page.
- Storefront public read endpoints are re-keyed from tenant/venue UUID to tenant/venue slug: **BREAKING** for any existing caller of the current UUID-based storefront read endpoints (`GET /storefront/venues/:tenantId`, `GET /storefront/venues/:tenantId/:venueId/products`, `GET /storefront/variants/:tenantId/:variantId/availability`) — no external caller has shipped against these yet, so this is a pre-launch rename, not a compatibility break for real users.
- `/loja/[tenantId]/[venueId]` becomes `/loja/[tenantSlug]/[venueSlug]`; the page and its checkout call resolve the slugs to the underlying tenant/venue UUIDs server-side, so `POST /checkout` and everything downstream (payment, ticket, QR) keep working with UUIDs unchanged.
- Existing `organizations` and `venues` rows get a backfilled slug (derived from `name`, disambiguated on collision) via migration.

Out of scope: product images/descriptions, per-area visual theming, tenant/venue branding beyond name, and any way to edit a slug after creation.

## Capabilities

### New Capabilities
- `storefront/tenant-landing`: public, account-less listing of a tenant's Venues by tenant slug, as the entry point of the storefront before a Venue's product listing.

### Modified Capabilities
- `foundation/organization`: Organization creation now assigns a unique slug alongside the tenant identifier.
- `foundation/venue`: Venue creation now assigns a slug unique within its Organization.
- `storefront/catalog`: public venue listing, product listing, and availability lookup are addressed by tenant/venue slug instead of tenant/venue UUID.

## Impact

- **Backend**: `organization`, `venue`, and `storefront` modules — schema migration (`slug` columns + backfill), create-use-cases, storefront routes/controllers/use-cases re-keyed to slug lookups.
- **Frontend**: new `apps/web/app/loja/[tenantSlug]/page.tsx`; existing `apps/web/app/loja/[tenantId]/[venueId]` moves to `apps/web/app/loja/[tenantSlug]/[venueSlug]` (route rename), `checkout-cart.tsx`/`actions.ts` updated to resolve slugs to UUIDs before calling `POST /checkout`.
- **Admin UI**: Organization bootstrap/signup form and the Venue creation form (`apps/web/app/admin/venues/venues-content.tsx`) gain a slug input (auto-suggested from name, editable before submit).
- No change to checkout, payment, ticketing, or access-control modules — they keep operating on UUIDs.
