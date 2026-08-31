## Why

The platform has no public-facing presence: `apps/web` today is only the admin scaffold (login, venues, products, resources), and nothing communicates the product's value to prospective pilot establishments (zoos, aquariums, museums, parks, tourist attractions with limited capacity). The MVP transactional flow (checkout, payment, ticketing, access control) is not built yet, so the immediate need is to capture leads from interested establishments and present the product's differentiator, not to sell a working transaction.

## What Changes

- **BREAKING**: `apps/web` route structure changes — the admin scaffold moves from the root path to a real `/admin` segment (`/login` → `/admin/login`, `/venues` → `/admin/venues`, `/products` → `/admin/products`, `/resources` → `/admin/resources`), organized under an `admin/` folder.
- Add a `(marketing)` route group that takes over the root path `/`:
  - `/` — landing page with Hero (headline, animated mockup of the platform flow: offer → checkout → QR → access granted, primary CTA), Como Funciona, Diferencial (not just ticketing — transaction + operational context, capacity as single source of truth, modular/API-first/multi-tenant), FAQ, and a final CTA.
  - `/sobre` — institutional page.
- Add a lead-capture CTA form on the landing page (establishment name, email, business type) that submits to a new backend endpoint.
- Add a Postgres table and backend endpoint (`apps/backend`) to persist submitted leads.

## Capabilities

### New Capabilities
- `marketing/landing-page`: public marketing routes (`/`, `/sobre`) — Hero, Como Funciona, Diferencial, FAQ, CTA sections, and the route reorganization that gives marketing pages the root path.
- `marketing/lead-capture`: backend capability to receive and persist lead submissions from the landing page CTA (Postgres table + endpoint).

### Modified Capabilities
(none — the admin pages' behavior is unchanged, only their URL prefix moves; this is captured as part of `marketing/landing-page`'s route reorganization, not a requirement change to any existing admin capability)

## Impact

- `apps/web/app/`: existing `page.tsx`, `login/`, `venues/`, `products/`, `resources/` move under a new `admin/` folder; new `(marketing)/` route group added with `page.tsx` and `sobre/page.tsx`.
- `apps/web/app/layout.tsx`: root layout may need adjustment to accommodate distinct marketing vs. admin layouts (`admin/layout.tsx`, `(marketing)/layout.tsx`).
- `apps/backend`: new Postgres table for leads, new endpoint to accept lead submissions.
- Any existing internal links or bookmarks to `/login`, `/venues`, `/products`, `/resources` break and must be updated to their `/admin/*` equivalents.
