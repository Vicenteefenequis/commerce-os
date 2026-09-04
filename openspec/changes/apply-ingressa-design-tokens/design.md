## Context

`apps/web` already has Tailwind v4 + `@theme` CSS-first tokens and a Radix-based component library for `admin/*` (see the archived `add-admin-design-system` change). The storefront (`/loja/...`) is consumer-facing, uses a different visual language entirely (dark nightlife marketplace vs. light admin console), and must not inherit or fight the admin token set. This change adds a second, independent token layer scoped to the storefront route group, following the same mechanism (`@theme` + CSS custom properties) that already works for admin.

Source: Claude Design project "Golden path: descoberta até acesso", file `Golden Path Tenants.dc.html` (screens `01`–`04` mobile, `W1`/`W2`/`M` web+mobile-compact).

## Goals / Non-Goals

**Goals:**
- A storefront-scoped token layer (color, typography, spacing, radius) that never leaks into or is overridden by admin styles, and vice versa.
- Base components matching the design's five recurring patterns: venue card, capacity bar, badge/pill, lote row, offer row, filter chip.
- Two shell layouts: desktop (persistent left filter rail + content) and mobile (chips + bottom sheet), so discovery/profile/checkout screens compose inside them rather than each re-implementing responsive breakpoints.

**Non-Goals:**
- Building the discovery grid, tenant profile, checkout panel, or ticket screens themselves (follow-up changes).
- A light-mode variant of the storefront theme — the design is dark-only by intent (nightlife/bar aesthetic); light mode is not requested and is explicitly out of scope.
- Any backend change.

## Decisions

### D1: Storefront tokens live in their own file, scoped via route group, not merged into `globals.css`
`apps/web/app/loja/theme.css` (imported from `apps/web/app/loja/layout.tsx`) defines an independent `@theme` block and custom-property palette (`--sf-color-bg: #07091C`, `--sf-color-accent: #FF7A2F`, etc.), prefixed `--sf-` to guarantee no collision with admin's `--color-*` tokens. Both stylesheets can be loaded in the same app without one overriding the other because Tailwind v4's `@theme` only affects utility classes generated from that CSS entry point's build, and the custom properties are namespaced.

Alternative considered: extend the existing `globals.css` token set with a storefront palette switched by a class/data-attribute (like admin's dark-mode). Rejected — the admin and storefront audiences, layouts, and component sets are unrelated; sharing one token file would force every future admin token change to consider storefront fallout and vice versa, for no reuse benefit (they share zero components).

### D2: Fonts via `next/font/google`, not a `<link>` tag
The design doc's raw HTML loads Archivo/JetBrains Mono via a Google Fonts `<link>` (fine for a static mockup, wrong for production — render-blocking, no self-hosting, no `font-display` control). Use `next/font/google` in `app/loja/layout.tsx` to self-host and subset both families, exposing them as CSS variables consumed by the `@theme` block from D1.

### D3: Components are presentational only, no data-fetching
`VenueCard`, `CapacityBar`, `OfferRow`, `LoteRow`, `Badge`, `FilterChip` take fully-resolved props (name, slug, distanceKm, capacityPct, priceFrom, etc.) — they do not fetch or know about tenant/product/resource shapes. This keeps them reusable across discovery, tenant-profile, and checkout without coupling to any one API response shape, and lets each consuming change (grid, profile, checkout) map its own data independently.

### D4: `CapacityBar` color bands are a fixed, shared rule
Green/neutral under 70%, orange 70–90%, red above 90%, gray when sold out (matches the design's "62% lotado" orange vs "94% lotado" red vs gray "esgotado" pill). Defined once in `CapacityBar` so discovery cards, the tenant profile, and the checkout panel never disagree on what counts as "almost full."

## Risks / Trade-offs

- [Risk] A second token system doubles the surface area to maintain → Mitigation: intentional isolation (D1) is cheaper than shared coupling given the two surfaces never share a screen or component.
- [Risk] No screens exist yet to prove the shell layouts against → Mitigation: same approach as `admin/design-system` — a temporary internal preview route exercises every component and both shells before follow-up changes consume them.
