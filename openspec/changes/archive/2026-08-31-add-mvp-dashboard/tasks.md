## 1. Order filtering (backend)

- [x] 1.1 Extend `KyselyOrderRepository.findAllByTenant` (or add a sibling method) to accept optional `orderId`, `customerQuery` (email/name), and `status` filters, joining `customers` for the name/email match; verify with a repository-level test covering each filter alone and combined
- [x] 1.2 Extend `GET /orders` query params (`id`, `customer`, `status`) and wire them to the repository filter; verify with a route test asserting each filter narrows the returned list and that an unfiltered request is unchanged
- [x] 1.3 Verify tenant isolation still holds with filters applied (Organization A's filter never returns Organization B's orders)

## 2. Dashboard summary (backend)

- [x] 2.1 Create `apps/backend/src/modules/admin` module skeleton (domain/application/infrastructure folders, following the existing module layout)
- [x] 2.2 Implement the summary query: GMV and average order value (orders in `paid`/`fulfilled`/`partially_refunded`/`refunded`, filtered by `tenant_id`, optional `venue_id`, and `created_at` within the requested range), order counts grouped by status for the same scope, and count of `scan_attempts` with `outcome = 'authorized'` filtered by `tenant_id`, optional `venue_id`, and `scanned_at` within range; verify with a unit/integration test covering each figure with seeded orders/payments/scan attempts across venues and periods
- [x] 2.3 Add `GET /dashboard/summary` route accepting `venueId` (optional), `from`, `to` query params, gated by `requireAuth` + `requirePermission("order:manage")`; verify with a route test for tenant isolation, venue filtering, and the zero-data case
- [x] 2.4 Verify GMV excludes `draft`/`awaiting_payment`/`cancelled`/`expired` orders and that refunded orders still count toward GMV per design.md

## 3. Dashboard screen (frontend)

- [x] 3.1 Add `apps/web/app/admin/dashboard/page.tsx` + content component, server-loading the summary per `admin/data-fetching` conventions; verify the initial HTML response contains the summary figures with no client-side fetch
- [x] 3.2 Add period selector (today / 7 days / 30 days / custom range) and optional venue selector as the screen's interactive leaf per `admin/data-fetching`'s Client Component scoping rule; verify changing the period/venue updates the rendered figures
- [x] 3.3 Render GMV, average order value, order counts by status, and visitor count using `admin/design-system` components; verify visually against the design system's existing list/detail screens
- [x] 3.4 Update post-login redirect and admin nav default route to land on `/admin/dashboard`; verify a fresh login lands on the dashboard

## 4. Order search (frontend)

- [x] 4.1 Add filter controls (order id, customer, status) to `apps/web/app/admin/orders/orders-content.tsx`, calling the extended `GET /orders` query params; verify searching by each filter narrows the list and clearing filters restores the full list

## 5. Validation

- [x] 5.1 Run backend test suite and confirm no regressions in `commerce`/`access`/`payments` modules touched by the new query
- [x] 5.2 Manually walk the MVP Definition of Done items 13-15 (visualizar venda, localizar pedido, acompanhar visitantes) end-to-end against seeded/staging data and confirm each is achievable from the admin UI alone
