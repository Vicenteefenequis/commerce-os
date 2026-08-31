## Context

See `proposal.md` - Why. `apps/web/app` is currently flat (no route groups): `page.tsx`, `login/`, `venues/`, `products/`, `resources/` all sit directly under `app/`, all admin, all unauthenticated-gate-free scaffolding from the Foundation phase. There is one shared `app/layout.tsx`. `apps/backend` is the existing API surface backing the admin app (Organization, Venue, Identity, Authorization, Audit, Configuration per `docs/ROADMAP.md`).

## Goals / Non-Goals

**Goals:**
- Give the marketing route group the root path without breaking the admin app's existing pages.
- Keep the lead-capture write path simple: one table, one endpoint, no dependency on the tenant/organization model.

**Non-Goals:**
- No CRM/email integration for captured leads (explicitly deferred - see proposal).
- No redesign of the admin app's own pages or navigation beyond the path prefix change.
- No real product telemetry or A/B testing infrastructure for the landing page.
- No authentication/authorization on marketing routes (they are public by definition).

## Decisions

**Route reorganization: real `admin/` folder + `(marketing)` route group.**
Next.js route groups (`(name)`) are invisible in the URL - they only organize files. Giving the admin app a real `/admin` prefix requires an actual folder segment named `admin`, not a group. The marketing pages don't need a URL prefix (landing page is `/`), so they use a route group purely for layout/organization, per the user's explicit choice of Option A (real prefix for admin) + Option C (route group for marketing). Each side gets its own `layout.tsx` (`admin/layout.tsx`, `(marketing)/layout.tsx`) so the marketing pages don't inherit any admin-specific chrome, and vice versa.

**Hero animation: simplified static mockup, not a real product recording.**
Per user direction, the animation depicts the flow (offer -> checkout -> QR -> access granted) as a simplified mockup, not a capture of the real product - because the transactional flow (M1-M5 in `docs/ROADMAP.md`) is not built yet. Alternative considered: abstract/conceptual animation (data points connecting) - rejected because a concrete flow mockup is more legible to the target audience (operators evaluating whether the flow fits their venue) than an abstract concept.

**Lead storage: dedicated Postgres table, no tenant scoping.**
A lead is a prospective establishment that has not been onboarded, so it has no organization/tenant to scope to. The table lives alongside existing backend persistence (same Postgres instance) but is not modeled as tenant data, avoiding the need to fabricate a placeholder organization just to satisfy the multi-tenant foundation (PRD 5.4 applies to tenant-owned entities; a lead is not yet one).

**No CRM integration.**
Per user direction, leads land in a plain Postgres table for now, no e-mail or CRM piping. Keeps the scope of this change bounded to the landing page itself.

## Risks / Trade-offs

- [Old `/login`, `/venues`, `/products`, `/resources` URLs stop resolving] -> Mitigation: this is a pre-MVP, internal-only admin app (Foundation phase, no external users onboarded yet per `docs/ROADMAP.md`), so the breaking change has no external blast radius; update any bookmarks/internal links as part of this change's tasks.
- [Hero animation being a mockup rather than the real product could set expectations the current build can't meet if a prospect asks for a live demo] -> Mitigation: FAQ section should be honest about current stage (pilot/early access), not claim the flow is live today.
- [Lead table with no validation beyond the endpoint could accumulate spam/junk submissions] -> Mitigation: covered by the lead-capture spec's required-field and email-format validation; rate limiting/anti-spam is explicitly out of scope for this change and can be added later if it becomes a problem.
