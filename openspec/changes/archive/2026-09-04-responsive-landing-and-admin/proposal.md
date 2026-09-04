## Why

The landing page and the tenant admin dashboard have partial, inconsistent responsive coverage. The admin is used in practice on phones at the venue entrance (scanner, quick order checks) and on tablets at the point of sale, not just desktop in the back office — so gaps there are functional breakages, not cosmetic ones. An exploration pass across both areas found one issue serious enough to block a task on mobile (the shared Dialog has no height cap or internal scroll, so a product-creation form with several variants can push the save button off-screen with no way to reach it) plus a small set of smaller layout gaps.

## What Changes

- Fix `components/ui/dialog.tsx` to cap content height and scroll internally on small viewports, so any dialog-based form (product creation, venue creation, future dialogs) stays reachable regardless of content length or on-screen keyboard.
- Add a mobile navigation collapse to `components/marketing/site-header.tsx` (logo + links + CTA currently render in one non-wrapping row).
- Add `flex-wrap` to the order action row in `app/admin/orders/[id]/order-detail-content.tsx` (Cancelar/Concluir/Reembolsar) so it doesn't overflow at 375px width.
- Stack the variant-name/price input pair in `app/admin/products/products-content.tsx` on narrow viewports instead of forcing them side by side inside the (now-scrollable) Dialog.
- Make the shared `components/ui/table.tsx` primitive responsive: below the `sm` breakpoint, rows collapse into stacked label/value cards instead of relying on horizontal scroll to reach columns and row actions. Applied to the four admin list screens that use it (Produtos, Recursos, Pedidos, Unidades), found during manual mobile verification of this change to be unusable without horizontal scrolling.
- Polish (lower priority, included if time allows): verify `components/marketing/hero-preview.tsx` legibility at the smallest supported width.

Out of scope: `/platform` console (internal, desktop-only usage confirmed with the user) and the public storefront/checkout (`/loja`, `/pay`), which were not part of this exploration.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `admin/design-system`: add requirements that the shared Dialog primitive remains usable (content reachable, scrollable) on small viewports, that admin action rows wrap rather than overflow on narrow screens, and that the shared Table primitive collapses to stacked cards on small viewports instead of requiring horizontal scroll to reach columns or row actions.
- `marketing/landing-page`: add a requirement that primary site navigation collapses to a mobile-usable pattern below the tablet breakpoint.

## Impact

- Code: `apps/web/components/ui/dialog.tsx`, `apps/web/components/ui/table.tsx`, `apps/web/components/marketing/site-header.tsx`, `apps/web/app/admin/orders/[id]/order-detail-content.tsx`, `apps/web/app/admin/orders/orders-content.tsx`, `apps/web/app/admin/products/products-content.tsx`, `apps/web/app/admin/resources/resources-content.tsx`, `apps/web/app/admin/venues/venues-content.tsx`, and (polish) `apps/web/components/marketing/hero-preview.tsx`.
- Dialog and Table are shared primitives already used beyond the screens named above (e.g. `/platform/tenants`, the design-system preview page); fixing them there benefits every current and future consumer without per-screen changes, though only the four named admin screens get per-column mobile labels in this change.
- No API, schema, or backend changes. No breaking changes to existing behavior — purely layout/CSS and markup adjustments.
