## 1. Dialog primitive (admin/design-system)

- [x] 1.1 Cap `RadixDialog.Content` height in `apps/web/components/ui/dialog.tsx` (`max-h-[85vh]` or equivalent) with `overflow-y-auto`, and add lateral spacing so content doesn't touch the viewport edge at 375px width
- [x] 1.2 Grep all existing `Dialog` usages (venues, products, any others) to confirm none rely on unbounded height; verify each still renders correctly
- [x] 1.3 Manually verify: open the product-creation dialog with several variant rows added at a 375px viewport with the on-screen keyboard simulated open (devtools mobile emulation), and confirm the Save button remains reachable by scrolling within the dialog — verified by the user against the running build on :3100

## 2. Marketing header mobile collapse (marketing/landing-page)

- [x] 2.1 Add a `useState` + `md:hidden`/`hidden md:flex` toggle to `apps/web/components/marketing/site-header.tsx`, mirroring the existing pattern in `components/layout/admin-nav-client.tsx`
- [x] 2.2 Verify at 375px and 768px viewport widths that the header shows a working toggle below the tablet breakpoint and the full row above it, with all links and the CTA reachable in both states — verified by the user against the running build on :3100

## 3. Admin action row wrapping (admin/design-system)

- [x] 3.1 Add `flex-wrap` (and adjust gap if needed) to the action button row in `apps/web/app/admin/orders/[id]/order-detail-content.tsx`
- [x] 3.2 Adjust the variant name/price input row in `apps/web/app/admin/products/products-content.tsx` to stack on narrow viewports instead of forcing two inputs side by side
- [x] 3.3 Verify both screens at 375px width show no horizontal overflow and all buttons/inputs remain legible and reachable — verified by the user against the running build on :3100

## 4. Polish (optional, time permitting)

- [x] 4.1 Verify `apps/web/components/marketing/hero-preview.tsx` legibility at 375px width (2-column flow-step grid); adjust only if text is genuinely illegible, not for cosmetic preference — verified by the user against the running build on :3100, no adjustment requested
- [x] 4.2 Note admin tables requiring horizontal scroll to reach row actions — originally logged as future-change material, superseded by section 6 below after manual mobile verification showed it was unusable, not just non-ideal

## 5. Validation

- [x] 5.1 Run `openspec validate responsive-landing-and-admin --strict` and confirm it passes
- [x] 5.2 Run the web app's lint/typecheck (e.g. `npm run lint` / `npm run build` in `apps/web`) and confirm no errors introduced by these changes

## 6. Responsive admin tables (admin/design-system)

- [x] 6.1 Update `apps/web/components/ui/table.tsx`: `Table`/`table` block-below-`sm`/table-at-`sm`, `TableHead` hidden-below-`sm`, `TableBody`/`TableRow` card chrome below `sm` (border/radius/padding/margin, stripped at `sm`+), `TableCell` accepts an optional `label` prop rendered as `data-label` with `before:content-[attr(data-label)]` layout below `sm` (plain block when no label), reverting to the existing table-cell layout at `sm`+
- [x] 6.2 Add matching `label` props to each `<TableCell>` in `apps/web/app/admin/products/products-content.tsx` (Nome, Variantes, Canais; action cell unlabeled)
- [x] 6.3 Add matching `label` props to each `<TableCell>` in `apps/web/app/admin/resources/resources-content.tsx` (Nome, Capacidade padrão, Tipo; action cell unlabeled; also added `flex-wrap` to its two-button action row, same overflow risk fixed elsewhere for order-detail buttons)
- [x] 6.4 Add matching `label` props to each `<TableCell>` in `apps/web/app/admin/orders/orders-content.tsx` (ID, Unidade, Status, Total)
- [x] 6.5 Add matching `label` props to each `<TableCell>` in `apps/web/app/admin/venues/venues-content.tsx` (ID, Nome, Slug)
- [x] 6.6 Spot-check `/platform/tenants` and `app/preview/design-system/page.tsx` (other `Table` consumers, out of the confirmed label-adding scope) still render correctly — unlabeled stacked cells below `sm`, unchanged table above it. Read both: plain `TableCell` usage only, no nested tables or absolutely-positioned children, so the CSS toggle applies cleanly.
- [x] 6.7 Manually verify at 375px: Produtos, Recursos, Pedidos, Unidades each render as labeled cards with no horizontal scroll needed to reach any value or row action; verify at 768px+ that all four still render as conventional tables — verified by the user against the running build on :3100
- [x] 6.8 Re-run `npm run lint` and `npm run build` in `apps/web` and confirm no errors introduced — both pass, only the pre-existing unrelated `<img>` warning in `ticket-viewer.tsx`
