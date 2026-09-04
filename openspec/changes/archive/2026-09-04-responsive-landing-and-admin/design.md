## Context

See proposal.md - Why. All four fixes are contained CSS/markup changes to existing React components in `apps/web`; no new dependencies, no data model, and no cross-service impact. This design only settles the handful of implementation choices that affect multiple call sites or future reuse.

## Goals / Non-Goals

**Goals:**
- Fix the Dialog primitive once so every current and future dialog-based form benefits, not just products.
- Reuse the existing mobile-nav pattern already proven in `AdminNavClient` for the marketing header, rather than inventing a second pattern.

**Non-Goals:**
- No visual redesign of the header, dialogs, or admin screens beyond what's needed for reachability/wrapping.
- No change to Dialog's Radix-based focus/keyboard behavior (already covered by the existing `Accessible interactive components` requirement).
- No table-to-card mobile transformation for admin lists (tracked as optional polish in the proposal, not required behavior here).

## Decisions

- **Dialog height cap**: constrain `RadixDialog.Content` with `max-h-[85vh]` (leaves visible margin above/below on small screens, matching the `top-1/2 -translate-y-1/2` centering already in place) and `overflow-y-auto`. Rejected `100dvh`-based sizing — adds complexity for a static admin tool where `vh` is adequate and matches the rest of the codebase's Tailwind usage.
- **Dialog lateral margin**: add a small horizontal margin/padding (e.g. `mx-4` equivalent via `w-[calc(100%-2rem)]` or existing `px-6` container adjustment) so `w-full` content doesn't touch viewport edges on the smallest supported width (375px). Exact utility left to implementation; constraint is "visible gap from viewport edge at 375px."
- **Header mobile collapse**: mirror `AdminNavClient`'s existing `useState` + `md:hidden`/`hidden md:flex` toggle pattern in `site-header.tsx`, rather than pulling in a new nav abstraction shared between admin and marketing — the two headers have different content (session/logout vs. CTA) and no other consumer needs a shared component yet.
- **Action row wrap**: `flex-wrap` plus a small `gap` on the existing flex containers (order detail actions, product variant inputs) — no layout restructuring, since the flex-based approach already used elsewhere in these screens tolerates wrapping without further changes.

- **Table mobile collapse**: implement with Tailwind display-mode toggling on the existing semantic `<table>` markup, no separate mobile-only component or duplicated markup per screen:
  - `table`: `block sm:table` (a plain block box below `sm`, a real table at `sm`+).
  - `thead`: `hidden sm:table-header-group` — column headers aren't needed once each cell carries its own label.
  - `tbody`: `block sm:table-row-group`.
  - `tr`: `block sm:table-row`, with card chrome (border, radius, padding, margin-bottom) applied only below `sm` so each row reads as a card; that chrome is stripped at `sm`+ where the row goes back to being a table row.
  - `td`: gains an optional `label` prop rendered as `data-label`; below `sm` it lays out `flex justify-between` with the label shown via `before:content-[attr(data-label)]` (label omitted entirely — falls back to a plain block cell — when the column doesn't need one, e.g. an actions-only cell), and reverts to `sm:table-cell` with the existing padding at `sm`+.
  - Rejected a duplicated "desktop table markup + separate mobile card markup" per screen: doubles the JSX to maintain per screen and drifts over time; the CSS-toggle approach keeps one row of markup as the single source of truth.
  - Rejected a JS-based `matchMedia` render branch: adds client-side hydration/flash-of-wrong-layout risk for something CSS handles natively.
- **Label source**: pass `label` explicitly per `<TableCell>` at each of the four call sites (matches the corresponding `<TableHeaderCell>` text) rather than trying to derive it automatically from `TableHead` at runtime — explicit is simpler than wiring cross-row header lookup through the DOM or props, and keeps `Table`'s sub-components independent of each other.
- **Which screens get labels**: only the four screens the user named (Produtos, Recursos, Pedidos, Unidades) get `label` props in this change. Other `Table` consumers (`/platform/tenants`, the design-system preview page) inherit the responsive card behavior for free via the shared primitive, but their cells render unlabeled (still readable, just without a field name) since they're out of the confirmed scope.

## Risks / Trade-offs

- [Capping Dialog height could clip content in an unusually tall, currently-unbounded dialog elsewhere in the app] → Grep all `Dialog` usages before landing to confirm none rely on unbounded height; `overflow-y-auto` degrades gracefully either way.
- [Duplicating the mobile-toggle pattern between `AdminNavClient` and the marketing header instead of extracting a shared component] → Accepted: the two headers' content and data (session vs. none) differ enough that a shared abstraction now would be premature; revisit if a third nav needs the same pattern.
- [Table display-mode toggling could interact oddly with a screen that puts unusual markup inside a `<td>`, e.g. nested tables or absolutely-positioned children] → None of the four target screens do this (checked while implementing); `/platform/tenants` and the preview page were spot-checked too and use only plain cell content.

## Open Questions

(none — all decisions above are settled; nothing here would change the specs or task breakdown)
