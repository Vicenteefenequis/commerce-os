## Context

Venue today is `{ id, tenantId, name, slug }` with a create-only admin screen and a single public storefront read pattern: every existing `storefront/*` capability is scoped to one tenant, identified by `tenantSlug` in the URL (see `storefront/catalog`, `storefront/tenant-entry`). There is no image upload infrastructure anywhere in the platform, and no existing cross-tenant public read. See proposal.md for why this change is needed.

## Goals / Non-Goals

**Goals:**
- Add owner-editable Venue profile fields and a publish toggle, editable from `admin/venues`.
- Add a presentation-only showcase page per Venue, decoupled from the purchase flow.
- Add the platform's first cross-tenant public read: a search over published Venues.

**Non-Goals:**
- No image upload/storage pipeline - `coverPhotoUrl` is a validated free-text URL field.
- No fixed category taxonomy - `category` is free text; the search UI may offer autocomplete over previously-used values, but the system does not enforce or normalize an enum.
- No geo/radius search - `city` filtering is an exact match, not distance-based.
- No ranking, pagination tuning, or search relevance beyond straightforward filtering - out of scope for this change.
- No changes to the purchase flow (`storefront/catalog`, `storefront/checkout`, `storefront/ticket-view`) itself; the showcase page only links into it.

## Decisions

**Showcase URL carries the tenant (`/vitrine/[tenantSlug]/[venueSlug]`), not a global slug.**
Venue slugs are unique only within their owning Organization today (`foundation/venue`). A global short slug (`/vitrine/[venueSlug]`) would require a data migration to resolve existing cross-tenant slug collisions and a new uniqueness constraint. Keeping the tenant segment reuses the existing slug scheme with zero migration. Alternative considered and rejected: global slug, deferred as a possible later change if a shorter URL becomes a priority.

**`coverPhotoUrl` is a plain URL field, not an upload.**
No storage/upload infrastructure exists in the platform yet. Validating a well-formed URL is enough to unblock the showcase and discovery eligibility rule without provisioning a bucket, an upload endpoint, or file-type/size limits. Alternative considered and rejected: S3-compatible upload, deferred - larger surface (storage provisioning, endpoint, validation) for a need this change doesn't require.

**`category` is free text with UI-side suggestions, not an enum.**
Avoids maintaining a fixed list and shipping a migration/PR every time a new category is needed. Search filtering degrades gracefully to exact/substring match on whatever values owners have actually entered; the search UI can surface previously-used values as suggestions to reduce drift without enforcing it server-side.

**Discovery eligibility is computed at read time, reusing `Product.isVisibleOnChannel('storefront')` + `Product.isAvailableAt(now)`.**
This is the exact rule `storefront/catalog` already uses to decide whether a Product is publicly visible. Reusing it means "has an active product" for discovery purposes never drifts from what the storefront itself considers purchasable - no separate "active" flag to keep in sync.

**Discovery is the first storefront capability that is NOT tenant-scoped.**
Every other `storefront/*` capability enforces tenant isolation as a hard requirement. Discovery's whole purpose is to cross tenants, so its read path is intentionally separate from the tenant-scoped storefront read path (`list-storefront-venues.usecase.ts` and friends) rather than reusing it with an isolation check disabled. This keeps the tenant-isolation guarantee simple and universally true everywhere except this one, clearly-named exception.

**Discovery reads by fanning out per-tenant, not with a single cross-tenant SQL query.**
`venues` and `products` both carry `FORCE ROW LEVEL SECURITY`, scoped by the `app.tenant_id` session variable (`1700000006000_row-level-security.cjs`, `1700000011000_catalog-capacity-rls.cjs`) - defense-in-depth so isolation holds even if application code forgets to filter. No single query executed as the backend's normal `app_user` role can read more than one tenant's rows. The `outbox-worker` needed the same kind of cross-tenant read and solved it with a dedicated Postgres role carrying an additional `USING (true)` policy (`1700000008000_outbox-worker-role.cjs`) - but that worker is an isolated process that only ever does cross-tenant work. Discovery runs inside the same HTTP backend that serves every tenant-scoped route on `app_user`; granting that role a blanket cross-tenant policy would weaken RLS's defense-in-depth guarantee for every other route, not just discovery.
Instead, `ListDiscoverableVenuesUseCase` lists every Organization id (the `organizations` table carries no RLS), then for each one sets `app.tenant_id` and calls the existing tenant-scoped repositories exactly as every other use case does, accumulating eligible results in memory before applying the city/category filters. No new database role, policy, or connection pool; RLS keeps protecting every read, including discovery's own. Trade-off: one query per Organization per search request, worst-case O(tenant count) - accepted for now per the existing "Eligibility rule computed per search request... could get slow as Venue count grows" risk below; revisit (e.g. a dedicated cross-tenant role scoped to `SELECT` only, or a materialized eligibility index) if that risk materializes.

## Risks / Trade-offs

- [Cross-tenant read is new territory] -> Isolate it in its own use case/route (`storefront/discovery`), not a parameter on an existing tenant-scoped read, so a future audit of "storefront reads are isolated by tenant" doesn't have to special-case existing code paths.
- [`coverPhotoUrl` as a bare URL can go stale, be hotlinked-blocked, or point at inappropriate content] -> Accepted for this change per explicit product decision; no server-side fetch/validation beyond URL well-formedness. A future change can add moderation or real upload if this proves to be a problem.
- [Free-text `category` fragments filtering ("Bar" vs "bar" vs "Barzinho")] -> Accepted per explicit product decision; UI-side suggestions mitigate without server-side normalization.
- [Eligibility rule (`published` + photo + active product) computed per search request across all tenants could get slow as Venue count grows] -> Not a concern at current/expected scale; revisit with an index or materialized eligibility flag if search latency becomes an issue.

## Migration Plan

- Additive only: new nullable/defaulted Venue columns (`description`, `address`, `city`, `category`, `coverPhotoUrl` nullable; `published` defaulting to `false`). No backfill required - existing Venues simply start unpublished with empty profiles, matching "Venue creation... defaults to unpublished with no profile fields set."
- No rollback complexity beyond the standard reversible migration for the new columns; no data is transformed or deleted.
