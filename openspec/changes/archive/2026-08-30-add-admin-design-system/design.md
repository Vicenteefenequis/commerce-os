## Context

`apps/web` is a bare Next.js 15 (App Router) + React 19 app: no CSS framework, no `globals.css`, no component library, a `@/*` path alias already configured in `tsconfig.json`. The `frontend-design` skill/plugin is installed at the project level and will be invoked when building the actual CRUD screens in a follow-up change — this change only lays the foundation it builds on: tokens and a base component library. See proposal.md for motivation; see specs/admin/design-system for the requirements.

## Goals / Non-Goals

**Goals:**
- A working Tailwind CSS setup with a token layer (color, typography, spacing, radius) exposed as CSS custom properties, so tokens can be referenced by both Tailwind utilities and any custom CSS.
- A small set of base components (Button, Input, Select, Table, Dialog, Toast, Badge, Card) built on Radix UI primitives, covering the accessibility requirements (keyboard operability, ARIA) without hand-rolling focus management.
- Two documented layout patterns (list screen, form screen) other engineers/agents can follow when building the actual CRUD screens next.

**Non-Goals:**
- Building the Organization/Venue/Product/Resource CRUD screens themselves (follow-up change).
- A Storybook or visual regression testing setup — out of scope until there's enough component surface to justify it.
- Consumer-facing (non-admin) styling.

## Decisions

### D1: Tailwind CSS + Radix UI primitives (per user decision)
Tailwind supplies the utility/token layer; Radix supplies unstyled, accessible interaction primitives (Dialog, DropdownMenu, Select, Tabs, Toast) that we style with Tailwind classes rather than reimplementing focus trapping, roving tabindex, and ARIA wiring by hand. This directly satisfies the "Accessible interactive components" requirement without custom a11y code to maintain and test.

Alternative considered: Tailwind alone, hand-built components. Rejected — the accessibility requirements (focus trap, keyboard nav, ARIA) are exactly what Radix already solves correctly; reimplementing them is real engineering cost for no behavioral gain.

### D2: Tokens as CSS custom properties, mapped into Tailwind via `@theme` (Tailwind v4 CSS-first config)
Colors, spacing, radius, and typography live as raw CSS custom properties in `globals.css` (e.g. `--color-primary-500`, `--color-bg`, `--radius-md`). Tailwind v4 is CSS-first — there is no `tailwind.config.ts` theme object to populate; instead an `@theme` block in `globals.css` maps Tailwind-facing tokens to those custom properties (e.g. `--color-primary: var(--color-primary-500);`), which is what makes `bg-primary`/`text-primary` utilities available.

Rationale: this is what makes "token change propagates everywhere" (spec requirement) and light/dark theming work with a single mechanism — dark mode is a `@media (prefers-color-scheme: dark)` block that redefines the raw custom properties, and every component that used the Tailwind utility (`bg-primary`, `text-fg`) picks up the new value automatically, with no per-component dark-mode logic.

Alternative considered: Tailwind's built-in `dark:` variant with hardcoded dark-mode utility classes sprinkled per component. Rejected — that scales linearly with component count and risks drift (a class added to one component's light state but not its dark state); redefining custom properties once in `globals.css` cannot drift by construction.

Corrected from the original plan, which assumed Tailwind v3's `tailwind.config.ts` theme-mapping API — the current stable release is Tailwind v4, which replaced that with CSS-first `@theme` configuration; no JS/TS config file is required for this change's needs.

### D3: Base components live in `apps/web/components/ui/`, one file per component
Each base component (`button.tsx`, `dialog.tsx`, `table.tsx`, etc.) is a thin wrapper: Radix primitive (where one exists) + Tailwind classes + the variant/size API the CRUD screens will need (e.g. `Button` variants: `primary`, `secondary`, `destructive`, `ghost`). No component library dependency (shadcn/ui, MUI) is installed wholesale — components are hand-written against Radix, following the same shape the `shadcn/ui` convention uses (copy-owned code, not an installed package), so the team can freely modify component internals without fighting an upstream API.

Alternative considered: install a full component library (e.g. MUI, Chakra). Rejected — heavier dependency surface and a fixed design language that fights "distinctive, non-generic" aesthetics (the installed `frontend-design` skill's stated goal); hand-owned components under `components/ui/` give full control over the token integration in D2.

### D4: Layout patterns documented as reusable layout components, not just prose
The "CRUD list layout pattern" and "CRUD form layout pattern" requirements are implemented as two composable layout components (e.g. `ListPageLayout`, `FormPageLayout`) in `components/layout/`, not only as a written convention. A follow-up screen composes its table/form inside these, inheriting the empty-state, create-action placement, and validation-error-display behavior for free rather than re-implementing it per screen.

## Risks / Trade-offs

- [Risk] Hand-owned components (D3) mean the team maintains accessibility correctness over time, not an upstream library → Mitigation: built directly on Radix primitives, which own the actual a11y behavior (focus trap, roving tabindex); the wrapper only adds styling, so there is little custom a11y logic to maintain or regress.
- [Risk] No visual regression testing means a token or component change could silently break existing screens → Mitigation: acceptable at this stage (no CRUD screens exist yet to regress); flagged as a Non-Goal to revisit once there's real screen surface.
- [Risk] Toast/async-feedback pattern (spec: "Consistent async operation feedback") has no screens to prove it against yet in this change → Mitigation: the Toast component and its API are built and manually exercised via a small internal demo/preview route, deferring full proof to the first real CRUD screen that uses it.
