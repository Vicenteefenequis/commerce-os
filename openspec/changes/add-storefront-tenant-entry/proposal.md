## Why

Today a consumer can only reach a tenant's storefront by already knowing both `tenantId` and `venueId` — there is no page at `/loja/[tenantId]`, so a business's own storefront link has no landing point that lists what it sells. This is phase 1 of a 3-phase plan to make the account-less storefront a real customer-facing experience (tenant entry → date-first ticket selection → live capacity display), scoped to a single tenant per link (no cross-tenant marketplace directory, per the PRD's "marketplace prematuro" risk).

## What Changes

- Add a `/loja/[tenantId]` page that lists the tenant's Venues (reusing the existing public `GET /storefront/venues/:tenantId` endpoint).
- When the tenant has exactly one Venue, redirect straight to that Venue's storefront page instead of showing a one-item list.
- When the tenant has multiple Venues, show them as a simple public picker (name only, no auth) linking to `/loja/[tenantId]/[venueId]`.
- When the tenant has zero Venues, or the tenant does not exist, show a clear "not found" state instead of an empty/broken page.

## Capabilities

### New Capabilities
- `storefront/tenant-entry`: the public, account-less landing page for a tenant's storefront link, listing its Venues and routing the consumer to the right one.

### Modified Capabilities
(none — reuses the existing `storefront/catalog` venue-listing endpoint as-is)

## Impact

- Affected code: `apps/web/app/loja/[tenantId]/page.tsx` (new file). No backend changes — `GET /storefront/venues/:tenantId` (storefront.routes.ts) already returns what this page needs.
- No changes to `commerce/checkout` or `storefront/checkout` flows; this only adds the entry point above the existing `[tenantId]/[venueId]` page.
