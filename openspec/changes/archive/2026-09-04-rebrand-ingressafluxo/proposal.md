## Why

The platform is publicly and internally referred to as "Commerce OS" as plain text with no visual mark — no favicon, no logo component, nothing but a bare string repeated in six places (marketing header/footer, admin nav, platform nav, browser tab title). The business has settled on a new name, **Ingressafluxo**, and a matching wordmark + icon (selected from an explored set of naming/symbol options), and wants every surface that currently shows "Commerce OS" to show the new identity instead.

## What Changes

- Introduce a reusable `Logo` component rendering the approved mark: a gate/arrow icon (two vertical bars with an orange arrow entering, `#E4772A`) paired with the wordmark "**Ingressa**fluxo" (bold "Ingressa" + regular, muted "fluxo", one word, no space).
- Add a favicon derived from the icon (none exists today).
- Replace all six literal "Commerce OS" text occurrences in `apps/web` with the `Logo` component (or the wordmark text where an icon doesn't fit, e.g. `<title>`/meta) — marketing header, marketing footer, admin nav, platform nav, root layout `<title>`/`description`, marketing page/`sobre` page metadata and body copy.
- **BREAKING**: rename the root `package.json` `"name"` field from `"commerce-os"` to `"ingressafluxo"`.
- Out of scope: renaming the repository directory/path, git remote, or any internal package names under `apps/*`/`packages/*` (only the root workspace name changes); no color-token or landing-page-copy changes (tracked separately by `redesign-landing-visual-identity`).

## Capabilities

### New Capabilities
- `foundation/branding`: the platform's canonical name ("Ingressafluxo") and visual mark (icon + wordmark), and the requirement that every surface presenting the platform's identity (marketing header/footer, admin nav, platform nav, browser tab) render it through one shared `Logo` component rather than ad hoc text.

### Modified Capabilities
(none — no existing spec's requirements reference the brand name or a logo; `admin/design-system` continues to own token/component *behavior*, not brand naming)

## Impact

- `apps/web/components/marketing/site-header.tsx`, `site-footer.tsx` — logo/text replaced.
- `apps/web/components/layout/admin-nav-client.tsx`, `platform-nav.tsx` — logo/text replaced.
- `apps/web/app/layout.tsx` — `<title>`/`description` metadata updated; favicon wired up.
- `apps/web/app/(marketing)/page.tsx`, `apps/web/app/(marketing)/sobre/page.tsx`, `apps/web/app/admin/page.tsx`, `apps/web/components/marketing/differentiator.tsx`, `apps/web/components/marketing/hero.tsx` — body/meta copy mentioning "Commerce OS" updated to "Ingressafluxo".
- New: `apps/web/components/brand/logo.tsx` (or similar), a favicon asset.
- `package.json` (repo root) — `name` field renamed.
- No API, schema, or route changes.
