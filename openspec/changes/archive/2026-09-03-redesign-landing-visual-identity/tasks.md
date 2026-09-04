## 1. Design tokens

- [x] 1.1 Load "Plus Jakarta Sans" and "Geist Mono" via `next/font/google` in the root layout and expose them as CSS variables, and verify both fonts render in the browser dev tools' computed font-family for a heading and an eyebrow label
- [x] 1.2 Update `--color-neutral-*` scale in `apps/web/app/globals.css` (light end toward `#F4F6FB`/`#E1E6F1`, dark end toward `#080C22`/`#05070F`) and verify the admin app's light theme and dark-mode block still render with correct bg/fg contrast (no unreadable text)
- [x] 1.3 Update `--color-primary-{400,500,600,700}` to `#F0A268`/`#C2600F`/`#D66C21`/`#AC5309` per design.md D1 and verify `bg-primary`, `hover:bg-primary-hover`, `active:bg-primary-active` render the new hues on an existing admin button
- [x] 1.4 Update `--color-success-500` to `#35D6A4` and verify any existing success-state UI (e.g. admin success badges/toasts) still passes basic contrast against its background
- [x] 1.5 Repoint `--font-sans` to the Plus Jakarta Sans stack and `--font-mono` to the Geist Mono stack in `globals.css`, and verify the change propagates to both admin and marketing without per-component edits
- [x] 1.6 Add a shared `.btn-primary-gradient` utility class (or Tailwind arbitrary-value pattern per design.md D2) in `globals.css` referencing `--color-primary-400`/`--color-primary`, and verify it renders the two-stop gradient on a test element
- [x] 1.7 Check WCAG AA contrast for: white button text on `--color-primary-600` (`#C2600F`... gradient end), and the dark-section body text opacity levels against the new dark neutral background, adjusting text opacity/color only if a pair fails, and verify with a contrast-checker tool

## 2. Hero section

- [x] 2.1 Replace `hero-flow-animation.tsx` with a new `hero-preview.tsx` implementing the sales-overview panel (headline figure, delta badge, bar chart, Pedidos/Ocupação média/Overbooking stats) and the Portaria/QR access-check panel, using only the shared tokens (no hardcoded hex), and verify it renders visually matching the reference design at desktop width
- [x] 2.2 Update `hero.tsx` to use the new dark gradient section background, updated headline/subheadline copy (unchanged text is fine if it doesn't reference "piloto"), and the new `hero-preview.tsx`, and verify the hero renders correctly on mobile (stacked) and desktop (side-by-side) widths
- [x] 2.3 Remove the "Programa piloto aberto" eyebrow badge from the hero and replace with either no badge or a non-pilot status indicator (e.g. a plain brand mark), and verify no "piloto" text remains in `hero.tsx`

## 3. Copy: remove pilot/MVP framing

- [x] 3.1 Update `site-header.tsx` CTA label from "Quero ser piloto" to a functionality-forward label (e.g. "Começar agora" or "Falar com o time") and verify the link still points to the lead-capture CTA section
- [x] 3.2 Update `hero.tsx` primary CTA label to match the new header CTA wording, and verify it still links to `#cta`
- [x] 3.3 Rewrite `cta-section.tsx` heading/eyebrow to drop "estabelecimentos piloto" framing (e.g. reframe as "Fale com nosso time" / "Comece a vender hoje") while preserving the lead-capture form's fields and submit behavior unchanged, and verify the form still submits successfully end-to-end
- [x] 3.4 Update `lead-form.tsx` submit button label from "Quero ser piloto" to match the new CTA wording, and verify the success/error states still render correctly
- [x] 3.5 Rewrite all four FAQ answers in `faq.tsx` to remove "piloto"/"MVP" references, describing current shipped capability (offers, capacity, checkout, ticket/QR issuance) per the new landing-page requirement, and verify by reading the rendered page that no FAQ text contains "piloto" or "MVP"
- [x] 3.6 Grep `apps/web/app/(marketing)/**` (including `sobre/page.tsx`) for "piloto" and "MVP" case-insensitively and resolve every remaining match, and verify the grep returns zero matches when re-run

## 4. Sections restyle

- [x] 4.1 Restyle `how-it-works.tsx` numbered steps to use the mono font token for the "01"-style labels and the updated primary color, and verify it visually matches the reference design's light "Como funciona" section
- [x] 4.2 Restyle the Diferencial section (`apps/web/app/(marketing)/page.tsx` or its dedicated component) to the dark gradient background and four-card grid from the reference design, keeping the existing four differentiator messages, and verify all four cards render with the new icon-swatch treatment
- [x] 4.3 Restyle `faq.tsx` to match the reference design's card/accordion look on the light section background, and verify keyboard accessibility (Tab + Enter to expand/collapse) still works via the existing `<details>` pattern or an equivalent accessible implementation
- [x] 4.4 Restyle `cta-section.tsx` to the dark gradient background from the reference design (proposal.md/design.md both describe "dark navy hero/CTA sections" as one visual treatment) and adjust `LeadForm`'s field styling for legibility on the dark background, and verify the form is usable and legible against the dark background

## 5. Verification

- [x] 5.1 Run the app locally, visit `/` and `/sobre`, and verify every section (Hero, Como Funciona, Diferencial, FAQ, CTA, footer) renders with the new palette and no layout regressions at mobile and desktop widths
- [x] 5.2 Verify the admin app (`/admin/login`, `/admin/venues` or dashboard) renders with the new primary/neutral tokens applied and no broken contrast or illegible text
- [x] 5.3 Submit a test lead through the landing page form and verify it is persisted (existing `marketing/lead-capture` behavior unchanged)
- [x] 5.4 Run `openspec validate --change redesign-landing-visual-identity --strict` (with `--store` if applicable) and verify it passes
