## Context

Data already exists across three modules that have never been joined for reporting: `orders`/`order_lines` (commerce), `payments` (payments), and `scan_attempts` (access). Order listing exists (`KyselyOrderRepository.findAllByTenant`, `GET /orders`) but returns every tenant Order unfiltered - `apps/backend/src/modules/commerce/infrastructure/order-repository.kysely.ts:85`. The admin app already has a server-side list→detail pattern (`admin/data-fetching`, `admin/design-system`) used by venues/products/resources/orders that this change follows rather than introduces.

## Goals / Non-Goals

**Goals:**
- One aggregation query per dashboard load, scoped by `tenant_id` and optional `venue_id`/date range, computed at read time (no pre-aggregated/materialized tables).
- Locate a specific order by id, customer, or status from the existing orders screen.
- Land the admin user somewhere useful (the dashboard) after login instead of nowhere in particular.

**Non-Goals:**
- The PRD §14.18 "evolution" metrics (occupancy, revenue per slot, LTV, cohort, conversion) - explicitly future work, not part of `vendas/pedidos/visitantes`.
- Historical/time-series charting - the summary is a snapshot for the selected period, not a trend graph.
- Pre-aggregation, caching, or a dedicated analytics store - pilot-scale data volume makes a live join sufficient; revisit only if it becomes a measured problem.

## Decisions

- **New module vs. extending existing ones**: put the summary query in a new `apps/backend/src/modules/admin` module rather than in `commerce`, since it reads across three modules' tables and belongs to none of them individually. It depends on the other modules' read models (raw `db` queries via Kysely, same as existing repositories), not the other way around.
- **GMV counts pre-refund order total, tagged `refunded`/`partially_refunded` separately in the status breakdown**: matches how `commerce/order`'s existing "active payment" requirement already treats `refunded` as a terminal-but-was-paid state. Avoids under-reporting GMV for a period just because a later refund happened after it.
- **Order filtering added to the existing `findAllByTenant`/`GET /orders`**, not a new endpoint: it's the same resource with narrower results, consistent with how `commerce/order`'s spec already frames listing as one requirement.
- **Visitor count = `authorized` scan attempts, not entitlements consumed**: the scan attempt is the operational event ("someone walked in"); entitlement consumption is a side effect of it. `access/scan` already guarantees at most one `authorized` outcome transitions an Entitlement, so the two numbers coincide in practice, but scan attempts is the more direct read for "visitantes" and avoids a second join into `entitlements`.
- **Period is required, venue is optional**: an unbounded aggregation over an entire tenant's history is the wrong default for a live dashboard load; a Venue filter is a refinement pilots with one venue won't need immediately, so it stays optional.

## Risks / Trade-offs

- [Live join on every dashboard load] → acceptable at pilot scale (single-digit venues, low order volume); indexed on `(tenant_id, created_at)` / `(tenant_id, venue_id, scanned_at)`, same pattern as existing tenant-scoped queries.
- [GMV definition (pre-refund total) could read as overstated revenue to an operator glancing at the number] → the order-status breakdown sits next to it in the same screen, so a `refunded` order's contribution is visible, not hidden.
