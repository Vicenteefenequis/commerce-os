## Context

`apps/web/app/globals.css` defines the shared token layer (design.md D2 of `add-admin-design-system`): raw `--color-*` custom properties on `:root`, redefined in a `prefers-color-scheme: dark` block, then mapped into Tailwind v4 via `@theme inline`. Both the admin app (`apps/web/app/admin/**`) and the marketing site (`apps/web/app/(marketing)/**`) consume the same Tailwind utilities (`bg-primary`, `text-fg`, `bg-surface`, etc.), so there is one token set, not two. See proposal.md for motivation; see specs/admin/design-system and specs/marketing/landing-page for requirements.

The approved visual reference (Claude Design canvas, `Commerce OS - Landing Redesign.dc.html`) renders the marketing page with a distinct dark hero/CTA treatment (`#05070F` → `#2A3D9E` gradient) alternating with light sections (`#F4F6FB`), while the current admin app is entirely light-neutral. This is a genuine visual-language decision, not an accident of the mockup: dark hero sections are a landing-page-only *composition* choice built from the same underlying token set (a dark neutral now exists in the scale; marketing sections opt into it, admin sections don't).

## Goals / Non-Goals

**Goals:**
- Replace token *values* (brand color scale, neutral scale, font families) in `globals.css` so both admin and marketing render the new palette/typography, per the confirmed decision to treat this as one design system.
- Give marketing components the CSS building blocks needed to compose the dark hero/CTA sections from the shared token set (e.g. a dark neutral endpoint and the gradient stops used in the reference design), without hardcoding one-off hex values in component files.
- Rebuild the Hero mockup component with the richer sales/portaria preview from the reference design.
- Remove pilot/MVP copy from every marketing component per the new `marketing/landing-page` requirement.

**Non-Goals:**
- Introducing per-page/per-tenant theming (out of scope; this is a one-time global token replacement).
- Changing the admin app's layout, component structure, or interaction patterns — only token values (color, font) change; no admin component file is edited.
- Redesigning `/sobre` beyond removing any pilot-framing copy it contains.
- Building a CMS or making landing copy configurable — copy remains hardcoded in the component files, just rewritten.

## Decisions

### D1: Token values change in place; token *names/roles* stay the same
`--color-primary-{400,500,600,700}`, `--color-neutral-{0..950}`, `--color-success-500`, etc. keep their existing names and semantic roles (primary/hover/active, bg/surface/border/fg) — only their hex values and the neutral scale's dark endpoint change to match the reference palette. `@theme inline` mappings in `globals.css` are untouched. This means every existing component (admin and marketing) picks up the new look with zero component-level edits, which is exactly what the "Consistent design tokens" requirement guarantees and what makes this a safe global change.

Mapping from the reference design to existing token slots:
- `--color-primary-500` (base) ← `#C2600F`... actually the reference's *interactive* brand color is `#E4772A` (buttons/badges use `#E4772A` → `#C2600F` as a gradient, not a flat fill) — see D2 for how the gradient is handled.
- `--color-primary-600` (hover) ← `#D66C21`
- `--color-primary-700` (active) ← `#AC5309`
- `--color-primary-400` (light accent, e.g. numbered eyebrows) ← `#F0A268`
- `--color-success-500` ← `#35D6A4`
- Light neutral scale (`--color-neutral-0` through `--color-neutral-300`) ← `#ffffff`, `#F4F6FB`, `#E1E6F1` family (admin's light theme and marketing's light sections both read from here)
- Dark neutral scale (`--color-neutral-800/900/950`, used by `prefers-color-scheme: dark` and by marketing's dark sections) ← `#080C22` / `#05070F` family
- `--font-sans` ← `"Plus Jakarta Sans", ui-sans-serif, system-ui, ...` (fallback stack preserved)
- New `--font-mono-label` role is NOT introduced; `--font-mono` is repointed to `"Geist Mono", ui-monospace, ...` since the reference only uses mono for short eyebrow/number labels, matching the existing token's use case.

Both Geist Mono and Plus Jakarta Sans are loaded as `next/font/google` in the root layout (consistent with how any web font would be added here — no new font-loading mechanism introduced).

Alternative considered: give marketing its own separate token file (`marketing-tokens.css`) so admin keeps its current warm-neutral palette untouched. Rejected per explicit product decision — the business wants one visual identity, and admin inheriting the new brand color is an accepted, intended consequence, not a side effect to work around.

### D2: Brand gradient handled as a utility, not a new token
The reference design's buttons/badges use a two-stop gradient (`linear-gradient(180deg, #E4772A, #C2600F)`) rather than a flat `--color-primary`. Rather than inventing a `--gradient-primary` token (which the token system has no precedent for and the "Consistent design tokens" requirement doesn't ask for), components apply the gradient as a local Tailwind arbitrary-value utility (`bg-[linear-gradient(180deg,theme(colors.primary-400),theme(colors.primary))]`) or a small shared `.btn-primary-gradient` class in `globals.css` that references the existing `--color-primary-400`/`--color-primary` custom properties. Either way, the two stops still resolve from the shared token values, so a future token change still propagates.

Alternative considered: flatten to a single solid `--color-primary` fill (drop the gradient) for simplicity. Rejected — the gradient is a visible, deliberate part of the approved design's brand feel; a shared class keeps it centrally defined (one place to change) without a new token category.

### D3: Hero mockup rebuilt as a static-with-CSS-accents component, not a canvas/animation library
The reference design's hero panel (sales chart bars, KPI row, portaria/QR card) is mostly static markup with a couple of CSS-only accents (subtle pulse/hover), matching the existing `hero-flow-animation.tsx` approach (plain CSS `@keyframes`, no animation library). The new component (`hero-preview.tsx`, replacing `hero-flow-animation.tsx`) follows the same pattern: hardcoded illustrative data (sales figure, occupancy %, bar heights) as static JSX, no chart library, no live data — it's a marketing illustration, not a real dashboard embed.

Alternative considered: embed a real, minified version of the actual admin dashboard component. Rejected — couples the marketing bundle to admin dashboard code/data-fetching for a purely illustrative visual, and the reference design's numbers are stylized/rounded (`R$ 128.000,16`, `+18,4%`), not meant to reflect real tenant data.

### D4: Copy rewrite is content-only; no new i18n/config mechanism
FAQ answers, hero copy, and CTA labels are rewritten directly in their existing component files (`faq.tsx`, `hero.tsx`, `cta-section.tsx`, `site-header.tsx`, `lead-form.tsx`), same as today (hardcoded Portuguese strings, no i18n layer). This change doesn't introduce one.

## Risks / Trade-offs

- [Risk] Changing global tokens changes the admin dashboard's appearance for existing users with no warning. → Mitigation: this is an explicit, confirmed product decision (one visual identity), not an oversight; the color *roles* (what's "primary," what's "danger") are unchanged, so no admin screen becomes harder to read — only the specific hues shift.
- [Risk] Contrast/accessibility regression: the new primary orange (`#E4772A`/`#C2600F`) and the dark neutral endpoint (`#05070F`) need to still meet WCAG AA against the text colors used on top of them (`#fff` on primary buttons, `rgba(255,255,255,.68)` body text on dark backgrounds). → Mitigation: verify contrast ratios for the specific pairs used in the reference design (button text on `#C2600F`, body text on `#05070F`) during implementation; the reference design's own text-opacity choices (e.g. `.66`–`.72` white) were presumably already tuned for its dark backgrounds and should be reused as-is rather than re-derived.
- [Risk] Removing "MVP/piloto" language could overstate current capability if the transactional flow genuinely isn't production-ready yet for all visitors. → Mitigation: per the new landing-page requirement, FAQ copy should describe what's concretely shipped (offers, capacity, checkout, ticket/QR issuance — all already true per the current FAQ draft) without claiming full production maturity beyond that; this is a copy-accuracy check during implementation, not a spec change.
