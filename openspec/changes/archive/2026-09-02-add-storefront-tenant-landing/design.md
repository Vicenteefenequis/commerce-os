## Context

See proposal.md - Why/What Changes for motivation. Relevant current state:

- `organizations` and `venues` have no `slug` column and no update endpoint (`organization.routes.ts` only has `POST /organizations` + `GET /:id`; `venue.routes.ts` only has `POST /venues` + `GET /venues`). Whatever slug value is assigned at creation is permanent for this change.
- The public storefront today is keyed entirely by UUID: `GET /storefront/venues/:tenantId`, `GET /storefront/venues/:tenantId/:venueId/products`, `GET /storefront/variants/:tenantId/:variantId/availability`, consumed by `apps/web/app/loja/[tenantId]/[venueId]/page.tsx`.
- Checkout, payment, ticketing, and access-control all key on UUID and are unaffected by this change — the storefront page already holds the tenant/venue UUIDs after resolving the current path params; it will hold them after resolving slugs instead.

## Goals / Non-Goals

**Goals:**
- Public storefront navigation addressed by human-readable slugs, from tenant landing down to a venue's product listing.
- Zero change to checkout/payment/ticketing request shapes — they keep receiving UUIDs.

**Non-Goals:**
- Editing a slug after creation (no update endpoint for Organization or Venue in this change).
- Any Organization admin/settings screen (still doesn't exist after this change — slug is only set at the existing creation points).
- Product imagery, descriptions, or per-tenant visual theming.

## Decisions

**Slug generation & validation.** Kebab-case, ASCII-folded (so pt-BR names like "Zoológico X" become `zoologico-x`), generated server-side from `name` at creation time. The create forms (Venue creation now; Organization at bootstrap/signup) show the generated slug as an editable input before submit, so the business can adjust it once, before it's permanent. Server re-validates format and uniqueness regardless of client input (uniqueness is global for Organization, scoped to `tenant_id` for Venue — matches the spec's "same slug allowed across different organizations" scenario). Collision is rejected with a clear error, not auto-suffixed, since the actor is present at the form to pick another value — auto-suffixing existing production rows is only needed for the one-time backfill (below), where no human is present to choose.

**Storefront routes re-keyed to slug (Option A, chosen over resolve-then-fetch-by-uuid).** New routes:
```
GET /storefront/tenants/:tenantSlug
GET /storefront/tenants/:tenantSlug/venues
GET /storefront/tenants/:tenantSlug/venues/:venueSlug/products
GET /storefront/tenants/:tenantSlug/venues/:venueSlug/variants/:variantId/availability
```
These replace the UUID-keyed public read routes outright (no dual-routing period — see proposal.md's BREAKING note: no real caller exists yet). Each response includes the resolved tenant/venue UUIDs alongside slugs, so the Next.js page that already fetched venues/products for the slug in the path has the UUIDs on hand to pass into `POST /checkout` without a second resolve call.

**Route rename in the web app.** `apps/web/app/loja/[tenantId]/[venueId]` becomes `apps/web/app/loja/[tenantSlug]/[venueSlug]`; `checkout-cart.tsx` and `actions.ts` keep sending UUIDs to `POST /checkout` (values now come from the fetched product-listing response instead of the route params).

**Backfill for existing rows.** A one-time migration script derives a slug from each existing `name`, lower-cased/ASCII-folded/hyphenated, appending a numeric suffix (`-2`, `-3`, ...) on collision within the same uniqueness scope. Runs once as part of the migration that adds the `NOT NULL` constraint.

## Risks / Trade-offs

- [Risk] Auto-suffixed backfill slugs for pre-existing dev/seed data could be non-obvious or ugly (e.g. two orgs both named "Zoológico" become `zoologico` and `zoologico-2`) → Mitigation: acceptable for this change since there's no real tenant data yet (per ROADMAP, pilot hasn't launched); flag before running the backfill against anything beyond local/dev data.
- [Risk] Removing the UUID-keyed public storefront routes is breaking for any integration that started depending on them → Mitigation: proposal.md documents this is pre-launch, no shipped caller exists; if that assumption turns out wrong, keeping both route sets alive briefly is a small addition, not a redesign.
- [Risk] Slug can never be corrected after a typo, since there's no update endpoint → Mitigation: out of scope by explicit decision (matches existing no-update posture of both entities); a future `PATCH /organizations/:id` / `PATCH /venues/:id` change can add editing without touching this change's specs.

## Migration Plan

1. DB migration: add `slug text` to `organizations` (unique) and `venues` (unique composite with `tenant_id`), nullable initially.
2. Backfill migration/script: derive and write slugs for existing rows (see Decisions).
3. Follow-up migration: set both `slug` columns `NOT NULL` now that every row has one.
4. Backend: `create-organization` and `create-venue` use cases accept/generate slug; new slug-keyed storefront use cases/controllers/routes; remove the old UUID-keyed public storefront routes.
5. Frontend: rename the `loja` route segment, add `apps/web/app/loja/[tenantSlug]/page.tsx` (tenant landing), update the venue page and checkout action to consume slug-keyed responses.
6. Admin: add the slug field to the Venue creation form and to the Organization bootstrap/signup form.

Rollback: each backend/frontend step ships as ordinary reverts; the two-phase DB migration (nullable slug → backfill → NOT NULL) keeps the schema change itself reversible up until step 3 lands.
