## Why

The landing page and its underlying design tokens still read as an early pilot recruitment page — a dark badge announcing "Programa piloto aberto," CTAs saying "Quero ser piloto," and FAQ copy about being "na fase de construção do MVP." A finalized visual redesign (dark navy hero with an amber/orange brand, richer hero mockup) has been produced and approved, and the business wants the public page to present Commerce OS as a capable, differentiated platform — not as an experiment recruiting testers — while still quietly capturing interested leads.

## What Changes

- Replace the current warm-neutral design tokens in `apps/web/app/globals.css` with the new palette: amber/orange primary (`#E4772A` base, `#C2600F` deep, `#F0A268` light), a dark navy neutral scale (`#05070F` → `#2A3D9E`) for the landing hero/CTA sections, a light neutral scale (`#F4F6FB`/`#E1E6F1`) for the alternating light sections, and a `#35D6A4` success/accent color. **BREAKING**: token values change globally, so the admin dashboard's visual appearance (buttons, badges, charts) changes along with the landing page since both consume the same shared tokens.
- Adopt the new typography pairing (Plus Jakarta Sans for body/headings, Geist Mono for eyebrow labels/numbered steps) as part of the shared font tokens.
- Rebuild the Hero section mockup: replace the current 4-step CSS animation with a richer static/animated dashboard preview (a sales-overview card with a bar chart and KPIs, plus a "Portaria" access-check card), matching the approved design.
- Remove all pilot/MVP-recruitment framing from visible landing copy: the hero eyebrow badge, header CTA, hero CTA, final CTA section heading/eyebrow, and FAQ answers. Replace with copy that presents shipped functionality and the platform's differentiator directly.
- Keep the lead-capture form and its submission behavior unchanged — visitors still submit establishment name, email, and business type, and the business still follows up — only the surrounding copy/labels change to drop the word "piloto" and reframe the FAQ answer about production status.
- Update the `marketing/landing-page` and `marketing/lead-capture` spec Purpose text to stop describing the audience as "prospective pilot establishments," aligning documentation with the new positioning.

## Capabilities

### New Capabilities
(none)

### Modified Capabilities
- `admin/design-system`: token *values* change (new brand/neutral palette, new font pairing), while the existing "single shared token set" requirement/behavior is unchanged — captured as a delta clarifying the token set now also serves the public marketing surface with a distinct dark hero treatment.
- `marketing/landing-page`: the Hero section's mockup content changes from a simple step animation to a richer dashboard/portaria preview; a new requirement is added that landing copy must not use pilot/exploratory framing and must instead present functionality and differentiation directly.
- `marketing/lead-capture`: Purpose text updated to drop "pilot" framing of the audience; submission behavior itself is unchanged.

## Impact

- `apps/web/app/globals.css` — token values (colors, fonts) rewritten.
- `apps/web/components/marketing/hero.tsx`, `hero-flow-animation.tsx`, `site-header.tsx`, `how-it-works.tsx`, `cta-section.tsx`, `faq.tsx`, `lead-form.tsx` — copy and visual updates.
- `apps/web/app/(marketing)/sobre/page.tsx` — reviewed for any pilot-framing copy.
- `apps/web/app/admin/**` — visually affected (not behaviorally) by the shared token change, since admin consumes the same `--color-primary`/neutral tokens.
- No API, schema, or lead-submission behavior changes.
