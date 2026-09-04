## Context

See proposal.md for motivation. Today "Commerce OS" is plain text repeated independently in six files (`site-header.tsx`, `site-footer.tsx`, `admin-nav-client.tsx`, `platform-nav.tsx`, `app/layout.tsx` metadata, plus body copy in `page.tsx`/`sobre/page.tsx`/`differentiator.tsx`/`hero.tsx`). There is no favicon and no existing logo/icon component to extend.

The approved mark comes from a naming/symbol exploration deck (Claude Design canvas) that evaluated six name compositions and six icon symbols. The business selected composition `2b` from that deck as final: wordmark "Ingressa" (bold) + "fluxo" (regular, muted) as one word, paired with `2b`'s own icon (not the deck's separately-recommended "Catraca" symbol, which was paired with a different, rejected name option).

This change lands independently of, and before, `redesign-landing-visual-identity` (a separate, already-planned change touching color tokens, typography, and hero/FAQ copy). Both changes touch overlapping files (`site-header.tsx`, `hero.tsx`); this change should merge/rebase cleanly since it only touches brand name/mark, not color tokens or pilot-copy language.

## Goals / Non-Goals

**Goals:**
- One shared `Logo` component (icon + wordmark) used by every surface that currently hardcodes "Commerce OS" as text.
- Exact reproduction of the approved mark's SVG/typography, not a reinterpretation.
- A real favicon file wired into `app/layout.tsx` metadata.
- Zero remaining "Commerce OS" strings anywhere in `apps/web` source.

**Non-Goals:**
- No color-token, font-token, or landing-page-copy changes (owned by `redesign-landing-visual-identity`).
- No animated/interactive logo treatment — static SVG + text only, matching the reference deck's static compositions.
- No rename of the repo directory, git remote, or `apps/*`/`packages/*` package names — only the root workspace `package.json` `name` field.
- No new design-token category for brand-mark colors; the icon's orange (`#E4772A`) already matches the existing `--color-primary-500`-family value used elsewhere, so it is referenced via the existing primary color token, not a new hardcoded hex in the component (see D1).

## Decisions

### D1: Logo component — exact markup, using existing tokens where they already match
Reproduce the reference deck's `2b` composition as a single component, `apps/web/components/brand/logo.tsx`:

```tsx
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg width="24" height="24" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <path d="M7 7 V25" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M25 7 V25" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M12 16 H21" stroke="var(--color-primary)" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M18 12.5 L21.5 16 L18 19.5" stroke="var(--color-primary)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="text-base font-extrabold tracking-tight">
        Ingressa<span className="font-normal text-fg-muted">fluxo</span>
      </span>
    </span>
  );
}
```

- The two vertical bars use `currentColor` (so they invert correctly against dark vs. light backgrounds, e.g. platform-nav vs. marketing header) instead of the reference's hardcoded `#fff`/`#0B1030` per-context duplication.
- The arrow + crossbar use the existing `--color-primary` token (already `#E4772A`-family per the current `admin/design-system` tokens) rather than a new hardcoded hex — the reference's icon color already coincides with the current primary token, so no new token is introduced.
- Wordmark styling (`font-extrabold` "Ingressa" + `font-normal text-fg-muted` "fluxo") reproduces the reference's weight/color contrast using existing Tailwind utility classes and the existing `--color-fg-muted` token, not new one-off styles.
- A `size`/`iconOnly` prop is deliberately NOT added — every current usage (header, footer, admin nav, platform nav) shows icon+wordmark together at roughly the same scale; if a future screen needs icon-only, extend then.

Alternative considered: keep the reference's literal hardcoded colors (`#fff` for dark surfaces, `#0B1030` for light surfaces) as two icon variants. Rejected — `currentColor` collapses this to one implementation, and the component already lives inside text-colored contexts (`text-fg`) on every current call site, so `currentColor` resolves correctly without a variant prop.

### D2: Favicon generation
Export the same icon geometry as a static SVG (`apps/web/app/icon.svg`, using Next.js App Router's automatic icon convention — a file literally named `icon.(svg|png|...)` in `app/` is picked up with no metadata wiring; `favicon` as a special name is reserved for `.ico` specifically). Use a flat `#E4772A` fill/stroke (no `currentColor`, since a favicon has no surrounding text color to inherit) on a transparent background. No build step or third-party favicon generator is introduced.

Alternative considered: hand-author a multi-size `.ico`. Rejected — Next's `app/favicon.svg`/`app/icon.svg` convention is sufficient for all evergreen browsers this product targets, and avoids a binary asset generation step.

### D3: Text-only occurrences (page `<title>`, meta `description`, body copy)
Where the current text is inside `<title>`/`<meta description>` (which cannot render SVG) or inline prose (e.g. `differentiator.tsx`, `sobre/page.tsx` body paragraphs), replace the literal string "Commerce OS" with "Ingressafluxo" as plain text — no attempt to inject markup into metadata strings or mid-sentence prose.

### D4: package.json root rename
Change only the root `package.json`'s `"name"` field (`"commerce-os"` → `"ingressafluxo"`). Workspace-internal package names (`apps/web`'s `"web"`, `apps/backend`'s `"backend"`) are untouched since nothing references the root package name programmatically (checked: no workspace `dependencies` entry points at it).

## Risks / Trade-offs

- [Risk] `currentColor` for the vertical bars means the icon is invisible if a future call site renders it with no inherited text color (e.g. `text-transparent`). → Mitigation: all four current call sites already set a text color class (`text-fg`, `text-sm font-semibold`); document the `currentColor` dependency in the component's one-line comment.
- [Risk] This change and `redesign-landing-visual-identity` touch overlapping files (`site-header.tsx`, `hero.tsx`) and may conflict if applied out of order. → Mitigation: per product decision, this change is applied first (it's the smaller, more isolated diff); `redesign-landing-visual-identity` should rebase onto it, not the reverse.
- [Risk] Grep-based "replace every Commerce OS occurrence" could miss a string with unusual casing/spacing (e.g. "CommerceOS" with no space). → Mitigation: tasks.md includes a final case-insensitive grep across `apps/web` for both "Commerce OS" and "CommerceOS" as a verification step.
