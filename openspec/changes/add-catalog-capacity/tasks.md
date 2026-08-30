## 1. Migrations

- [ ] 1.1 Create migration for `products` and `product_variants` tables (tenant_id, venue_id FK, name, availability window columns, channel visibility) and verify `npm run migrate up` succeeds
- [ ] 1.2 Create migration for `resources`, `resource_capacity_periods` (default + per-period capacity, hard-capacity flag), and `resource_capacity_commitments` (append-only ledger: resource_id, period, amount, status, created_at) and verify `npm run migrate up` succeeds
- [ ] 1.3 Enroll all five new tables in RLS `TENANT_TABLES` following the `1700000006000_row-level-security.cjs` pattern and verify a cross-tenant `SELECT` against each table returns zero rows in a migration/integration test
- [ ] 1.4 Add `product:manage`, `product:read`, `resource:manage`, `resource:read` to the authorization module's permission table and verify existing role-to-permission tests still pass plus new permissions resolve for `owner`/`admin`

## 2. Catalog domain and application

- [ ] 2.1 Implement `Product` and `ProductVariant` domain entities (mirroring `venue.entity.ts`) enforcing name and price required, and verify unit tests cover creation validation
- [ ] 2.2 Implement `CreateProductUseCase` and verify a unit test creates a product with variants under an existing venue
- [ ] 2.3 Implement `UpdateProductUseCase` (price, availability window, channel visibility changes) and verify a unit test confirms price change does not mutate already-placed order snapshots (spec: catalog/product - Price change does not affect past orders — test with a stubbed order snapshot check)
- [ ] 2.4 Implement `ListProductsUseCase` / `GetProductUseCase` scoped to venue/tenant and verify a unit test rejects cross-tenant reads

## 3. Catalog infrastructure

- [ ] 3.1 Implement `KyselyProductRepository` and verify integration tests against a real Postgres instance for create/read/update
- [ ] 3.2 Implement `product.controller.ts` and `product.routes.ts` wiring `POST /products`, `GET /products`, `GET /products/:id`, `PATCH /products/:id` through `requireAuth` + `requirePermission("product:manage"|"product:read")` + `txRoute`, and verify an HTTP integration test for each route
- [ ] 3.3 Wire product mutations to write audit entries in the same transaction and verify an integration test asserts an audit_log row exists after a price change (spec: catalog/product - Product mutations are audited)
- [ ] 3.4 Register `productRouter` in `apps/backend/src/http/app.ts` and verify `GET /products` responds through the running app

## 4. Capacity domain and application

- [ ] 4.1 Implement `Resource` domain entity and verify unit tests cover creation validation (name required, venue required)
- [ ] 4.2 Implement capacity calculation logic (`configured_capacity - SUM(commitments where status in held/consumed)`, floored at zero) as a pure function/use case and verify unit tests cover the "available capacity never goes negative" and "period override takes precedence" scenarios
- [ ] 4.3 Implement `CreateResourceUseCase` and `SetResourceCapacityUseCase` (default + period override) and verify unit tests for both
- [ ] 4.4 Implement a `CommitCapacityUseCase` (used by tests only in this change — no real caller yet per design.md Non-Goals) that runs `SELECT ... FOR UPDATE` on the period row then inserts a commitment only if it fits, and verify a concurrency test: two simultaneous commitments whose combined size exceeds remaining hard capacity result in exactly one accepted and one rejected (spec: capacity/resource - Concurrent commitments do not exceed hard capacity)

## 5. Capacity infrastructure

- [ ] 5.1 Implement `KyselyResourceRepository` (including the row-locked capacity read/commit path from design.md D3) and verify integration tests against real Postgres
- [ ] 5.2 Implement `resource.controller.ts` and `resource.routes.ts` wiring `POST /resources`, `GET /resources`, `PUT /resources/:id/capacity` through `requireAuth` + `requirePermission("resource:manage"|"resource:read")` + `txRoute`, and verify an HTTP integration test for each route
- [ ] 5.3 Wire resource/capacity mutations to write audit entries in the same transaction and verify an integration test asserts an audit_log row exists after a capacity override (spec: capacity/resource - Resource and capacity mutations are audited)
- [ ] 5.4 Register `resourceRouter` in `apps/backend/src/http/app.ts` and verify `GET /resources` responds through the running app

## 6. Cross-cutting verification

- [ ] 6.1 Run the full backend test suite and verify it passes with no regressions to existing Foundation module tests
- [ ] 6.2 Manually verify via `docker compose` + live Postgres (per the project's existing verification pattern from the Foundation change) that RLS actually blocks a cross-tenant query against each new table, not just the application-level filter
