## Why

The storefront (`/loja/...`) currently has no shared visual language: no dark theme, no token layer, no shared card/badge/progress components. A Claude Design exploration ("Golden Path Tenants") defines the target look for the whole discovery-to-access flow — a dark, high-contrast nightlife-marketplace aesthetic (Archivo + JetBrains Mono, orange accent `#FF7A2F` on near-black `#07091C`) with a small set of recurring patterns: venue card, capacity bar, lote row, offer row, pill/chip filter. Every downstream change in this plan (discovery grid, tenant profile, checkout panel, ticket/access screen) reuses these same patterns, so building them once now avoids four rounds of one-off styling and drift between screens.

This mirrors the reasoning behind `admin/design-system`: lay the token + component foundation before the screens that consume it.

## What Changes

- Define a storefront token layer (color, typography, spacing, radius) as CSS custom properties, scoped to `/loja` routes only — distinct from and not overriding `admin/design-system`'s tokens.
- Load `Archivo` (400/500/600/700/800) and `JetBrains Mono` (400/500/700) via `next/font` (not a runtime Google Fonts `<link>`, to avoid render-blocking and match Next.js conventions already used elsewhere in `apps/web`).
- Build a small storefront component library: `VenueCard`, `CapacityBar` (color-coded by percentage: normal / >90% warning / sold-out), `Badge` (verified checkmark, "% lotado", "esgotado hoje" pill), `LoteRow` (radio-style tier row with price + remaining count), `OfferRow` (date block + title + capacity + price), `FilterChip`/`FilterPill`.
- Establish the two responsive shells the design defines: a desktop shell with a persistent left rail (filters) + main content, and a mobile shell with chips + bottom sheet, sharing the same components.
- Out of scope: any change to `admin/*` screens; any backend/API change; the actual discovery/profile/checkout/ticket screens themselves (follow-up changes consume this).

## Capabilities

### New Capabilities
- `storefront/design-system`: The shared visual language and component library storefront (consumer-facing, `/loja/...`) screens are built from — tokens, base components, and the two responsive shell patterns (desktop rail, mobile chips+sheet).

### Modified Capabilities
(none)

## Impact

- New `apps/web/app/loja/theme.css` (or equivalent), imported only within the `/loja` route group's layout — not `app/globals.css` — so admin styling is unaffected.
- New `apps/web/components/storefront/` directory housing `VenueCard`, `CapacityBar`, `Badge`, `LoteRow`, `OfferRow`, `FilterChip`, and the two shell layout components.
- `apps/web/app/loja/layout.tsx` updated to import the storefront theme and apply fonts via `next/font`.
- No changes to `apps/backend` or any API contract.
