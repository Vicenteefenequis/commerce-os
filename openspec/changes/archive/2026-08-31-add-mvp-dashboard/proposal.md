## Why

The pilot establishment has no way to see how the business is doing or find a specific order without a developer querying the database directly. M1-M5 closed the transactional path (reservation → order → payment → ticket → access), but items 13-15 of the MVP Definition of Done (PRD §43) - "visualizar venda", "localizar pedido", "acompanhar número de visitantes" - remain unmet, and PRD §30 lists Dashboard (vendas, pedidos, visitantes) as MVP-obligatory scope. This is the last milestone (M6) before the MVP can be considered functional end-to-end without engineering intervention.

## What Changes

- Add `GET /dashboard/summary`: tenant-scoped, filterable by venue and date range, returning:
  - **vendas**: GMV (sum of paid+ order totals) and average ticket value for the period
  - **pedidos**: order count by status for the period
  - **visitantes**: count of `authorized` scan attempts (successful entries) for the period, distinct from tickets sold
- Add an admin **Dashboard** screen (`apps/web/app/admin/dashboard`) as the default landing page after login, rendering the summary with a period filter (today / 7 days / 30 days / custom range) and an optional venue filter.
- Add search/filter to the existing `GET /orders` and orders admin screen (`apps/web/app/admin/orders`) - by order id, customer email/name, and status - so a specific order can actually be located instead of scanned by eye in an unfiltered list. This closes DoD item 14 ("localizar pedido"), which the M3 admin change (`archive/2026-08-31-add-order-payment-admin`) explicitly left as a flat, unfiltered list.

## Capabilities

### New Capabilities

- `admin/dashboard`: sales/orders/visitor summary aggregation (`GET /dashboard/summary`) and the admin overview screen that renders it, scoped by tenant, filterable by venue and date range.

### Modified Capabilities

- `commerce/order`: new requirement that `GET /orders` supports filtering by order id, customer email/name, and status, so a specific tenant order can be located without retrieving the full unfiltered list.

## Impact

- Backend: new `apps/backend/src/modules/admin` (or similar) aggregation query joining `orders`, `payments`, and `scan_attempts` by `tenant_id` (+ optional `venue_id`) and date range; `apps/backend/src/modules/commerce` order list query extended with filter params.
- Frontend: new `apps/web/app/admin/dashboard/` (page, content) following the existing list-screen pattern (`admin/data-fetching`, `admin/design-system`); `apps/web/app/admin/orders/orders-content.tsx` gets filter controls; admin nav/login redirect updated to land on the dashboard.
- No new permissions: order search reuses `order:manage`, which already gates `GET /orders`. The dashboard summary is read-only aggregation over the same data and is gated behind `order:manage` too, since it exposes order/payment figures.
