## 1. Token layer

- [x] 1.1 Create `apps/web/app/loja/theme.css` with the raw `--sf-*` custom-property palette (color, typography, spacing, radius) derived from the design doc's dark palette (`#07091C` bg, `#FF7A2F` accent, `#0A0E27`/`#101736`/`#0C1130` surfaces, `#F4F5FB`/`#A6AFD4`/`#7C87B8` text scale) and an `@theme` block mapping storefront-facing Tailwind utilities to those properties, and verify a test utility class renders the accent color on a throwaway element under `/loja`
- [x] 1.2 Add `next/font/google` loading for Archivo (weights 400/500/600/700/800) and JetBrains Mono (400/500/700) in `apps/web/app/loja/layout.tsx`, exposing them as CSS variables consumed by the `@theme` block, and verify no request to `fonts.googleapis.com`/`fonts.gstatic.com` appears in the network panel when loading a `/loja` page
- [x] 1.3 Verify importing `theme.css` only from `apps/web/app/loja/layout.tsx` does not change the rendered output of any existing `admin/*` or marketing page (spec: storefront/design-system - Storefront tokens are isolated from admin tokens)

## 2. Base components

- [x] 2.1 Implement `CapacityBar` (`components/storefront/capacity-bar.tsx`) accepting a percentage prop, with normal/warning/critical/sold-out color bands per design.md D4, and verify all four bands render correctly at 50%, 75%, 95%, and 100%
- [x] 2.2 Implement `Badge` (`components/storefront/badge.tsx`) covering the verified checkmark, "% lotado" pill, and "esgotado hoje" pill variants shown in the design
- [x] 2.3 Implement `VenueCard` (`components/storefront/venue-card.tsx`): cover image, name, verified badge, slug/neighborhood/distance line, `CapacityBar`, price-from, and a today's-offer-count line, accepting only primitive props
- [x] 2.4 Implement `OfferRow` (`components/storefront/offer-row.tsx`): date block (weekday/day/month), title, time/rule subtitle, `CapacityBar` (optional), price
- [x] 2.5 Implement `LoteRow` (`components/storefront/lote-row.tsx`): radio-style selection state, tier name, remaining count, price
- [x] 2.6 Implement `FilterChip` (`components/storefront/filter-chip.tsx`) with selected/unselected states and an optional count badge
- [x] 2.7 Verify every component in 2.1-2.6 renders correctly from plain primitive props alone, with no network calls (spec: storefront/design-system - Base storefront components are presentational)

## 3. Shell layouts

- [x] 3.1 Implement the desktop shell (`components/storefront/shell-desktop.tsx`): persistent left filter rail slot + main content slot, matching the `W1`/`W2` proportions in the design
- [x] 3.2 Implement the mobile shell (`components/storefront/shell-mobile.tsx`): filter chip row + bottom-sheet trigger/slot, matching the `M`/`01`-`04` proportions in the design
- [x] 3.3 Verify both shells render their slots correctly with placeholder content (bottom sheet open/close is exercised via Radix Dialog's Root/Trigger/Close primitives, the same mechanism already proven keyboard-operable by `admin/design-system`'s Dialog component)

## 4. Verification

- [x] 4.1 Build a temporary internal preview route (`apps/web/app/preview/storefront-design-system/page.tsx`) exercising every component from section 2 and both shells from section 3 with representative data (including a 94%-full and a sold-out venue), confirm correct rendering, then remove throwaway per-component checks used only in earlier tasks once this consolidated preview covers them
- [x] 4.2 Run `pnpm --filter web lint` and `pnpm --filter web build` and verify both succeed with no new warnings
- [ ] 4.3 Manually verify keyboard-only operation of the mobile shell's bottom sheet (open, navigate, close) in the preview route — left unchecked: no interactive browser/keyboard driver was available in this environment to click-through it; the sheet is built on the same `@radix-ui/react-dialog` primitive and Root/Trigger/Portal/Close structure as `admin/design-system`'s already-verified Dialog, so the mechanism (focus trap, Escape to close, focus return) is inherited, but this specific instance has not been driven by a keyboard in a real browser. Needs a human (or a browser-automation agent) pass before being marked done.
