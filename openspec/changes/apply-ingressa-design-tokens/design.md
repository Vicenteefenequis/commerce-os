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

### D1: Storefront tokens live in their own file, isolated by CSS scope (class), not by file/build boundary
`apps/web/app/loja/theme.css` defines an independent `@theme` block and custom-property palette (`--sf-color-bg: #07091C`, `--sf-color-accent: #FF7A2F`, etc.), prefixed `--sf-` to guarantee no collision with admin's `--color-*` tokens, with the raw custom properties scoped under a `.storefront-theme` class rather than `:root`. It is `@import`ed from `apps/web/app/globals.css` (immediately after `@import "tailwindcss"`), and `apps/web/app/loja/layout.tsx` applies the `.storefront-theme` class (plus the font variables from D2) to scope where the tokens actually take visual effect.

Corrected from the original plan, which assumed `theme.css` could be loaded as its own independent stylesheet directly from `app/loja/layout.tsx`, never touching `globals.css`: verification (task 1.1) showed Tailwind v4's utility generation for a `@theme` block only runs within the same build as `@import "tailwindcss"` — a CSS file with only `@theme` and no Tailwind import produces its plain CSS (the `.storefront-theme { --sf-color-bg: ...; }` block) but never the corresponding utility classes (`bg-sf-accent`, `rounded-sf-pill`, etc.). Isolation from admin's tokens is therefore achieved by CSS scope (the `.storefront-theme` class boundary), not by keeping the token file out of `globals.css`'s import graph — both mechanisms give the same guarantee (admin markup never gains storefront styling), but only the scope-based one actually works with Tailwind v4's architecture.

Alternative considered: extend the existing `globals.css` token set with a storefront palette switched by a class/data-attribute (like admin's dark-mode). Rejected — the admin and storefront audiences, layouts, and component sets are unrelated; sharing one token *definition* (as opposed to one token *file*) would force every future admin token change to consider storefront fallout and vice versa, for no reuse benefit (they share zero components). This change's tokens remain fully separate values in their own file; only the build-inclusion mechanism changed.

### D2: Fonts via `next/font/google`, not a `<link>` tag
The design doc's raw HTML loads Archivo/JetBrains Mono via a Google Fonts `<link>` (fine for a static mockup, wrong for production — render-blocking, no self-hosting, no `font-display` control). Use `next/font/google` in `app/loja/layout.tsx` to self-host and subset both families, exposing them as CSS variables consumed by the `@theme` block from D1.

### D3: Components are presentational only, no data-fetching
`VenueCard`, `CapacityBar`, `OfferRow`, `LoteRow`, `Badge`, `FilterChip` take fully-resolved props (name, slug, distanceKm, capacityPct, priceFrom, etc.) — they do not fetch or know about tenant/product/resource shapes. This keeps them reusable across discovery, tenant-profile, and checkout without coupling to any one API response shape, and lets each consuming change (grid, profile, checkout) map its own data independently.

### D4: `CapacityBar` color bands are a fixed, shared rule
Green/neutral under 70%, orange 70–90%, red above 90%, gray when sold out (matches the design's "62% lotado" orange vs "94% lotado" red vs gray "esgotado" pill). Defined once in `CapacityBar` so discovery cards, the tenant profile, and the checkout panel never disagree on what counts as "almost full."

## Risks / Trade-offs

- [Risk] A second token system doubles the surface area to maintain → Mitigation: intentional isolation (D1) is cheaper than shared coupling given the two surfaces never share a screen or component.
- [Risk] No screens exist yet to prove the shell layouts against → Mitigation: same approach as `admin/design-system` — a temporary internal preview route exercises every component and both shells before follow-up changes consume them.
