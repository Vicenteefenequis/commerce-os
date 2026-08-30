## 1. Migrations

- [x] 1.1 Create migration for `products` and `product_variants` tables (tenant_id, venue_id FK, name, availability window columns, channel visibility) and verify `npm run migrate up` succeeds
- [x] 1.2 Create migration for `resources`, `resource_capacity_periods` (default + per-period capacity, hard-capacity flag), and `resource_capacity_commitments` (append-only ledger: resource_id, period, amount, status, created_at) and verify `npm run migrate up` succeeds
- [x] 1.3 Enroll all five new tables in RLS `TENANT_TABLES` following the `1700000006000_row-level-security.cjs` pattern (verified manually against live Postgres in 6.2, consistent with how the Foundation change itself verified RLS — no automated RLS test harness exists in this codebase)
- [x] 1.4 Add `product:manage`, `product:read`, `resource:manage`, `resource:read` to the authorization module's permission table and verify existing role-to-permission tests still pass plus new permissions resolve for `owner`/`admin`

## 2. Catalog domain and application

- [x] 2.1 Implement `Product` and `ProductVariant` domain entities (mirroring `venue.entity.ts`) enforcing name and price required, and verify unit tests cover creation validation
- [x] 2.2 Implement `CreateProductUseCase` and verify a unit test creates a product with variants under an existing venue
- [x] 2.3 Implement `UpdateProductUseCase` (price, availability window, channel visibility changes) and verify a unit test confirms price change does not mutate already-placed order snapshots (spec: catalog/product - Price change does not affect past orders — test with a stubbed order snapshot check)
- [x] 2.4 Implement `ListProductsUseCase` / `GetProductUseCase` scoped to venue/tenant and verify a unit test rejects cross-tenant reads

## 3. Catalog infrastructure

- [x] 3.1 Implement `KyselyProductRepository` (no automated Postgres-backed test harness exists yet in this codebase — covered by manual live-stack verification in 6.2, consistent with the Foundation change's own verification approach)
- [x] 3.2 Implement `product.controller.ts` and `product.routes.ts` wiring `POST /products`, `GET /products`, `GET /products/:id`, `PATCH /products/:id` through `requireAuth` + `requirePermission("product:manage"|"product:read")` + `txRoute` (mirroring `venue.controller.ts`/`venue.routes.ts`, which likewise have no dedicated controller test — verified manually via 6.2)
- [x] 3.3 Publish `product.created`/`product.updated`/`product.price_changed` domain events via `OutboxEventPublisher` in the same transaction as each mutation, and register corresponding `audit` consumers in `registerAuditConsumers` (design.md D5 — audit is outbox-driven, not inline) and verify a unit test on the use case asserts the correct event is published
- [x] 3.4 Register `productRouter` in `apps/backend/src/http/app.ts` and verify `GET /products` responds through the running app

## 4. Capacity domain and application

- [x] 4.1 Implement `Resource` domain entity and verify unit tests cover creation validation (name required, venue required)
- [x] 4.2 Implement capacity calculation logic (`configured_capacity - SUM(commitments where status in held/consumed)`, floored at zero) as a pure function/use case and verify unit tests cover the "available capacity never goes negative" and "period override takes precedence" scenarios
- [x] 4.3 Implement `CreateResourceUseCase` and `SetResourceCapacityUseCase` (default + period override) and verify unit tests for both
- [x] 4.4 Implement a `CommitCapacityUseCase` (used by tests only in this change — no real caller yet per design.md Non-Goals) that acquires the advisory lock then inserts a commitment only if it fits (design.md D3), and verify a concurrency test: two simultaneous commitments whose combined size exceeds remaining hard capacity result in exactly one accepted and one rejected (spec: capacity/resource - Concurrent commitments do not exceed hard capacity)

## 5. Capacity infrastructure

- [x] 5.1 Implement `KyselyResourceRepository` (including the advisory-lock-guarded capacity read/commit path from design.md D3) — covered by manual live-stack verification in 6.2, consistent with 3.1
- [x] 5.2 Implement `resource.controller.ts` and `resource.routes.ts` wiring `POST /resources`, `GET /resources`, `PUT /resources/:id/capacity` through `requireAuth` + `requirePermission("resource:manage"|"resource:read")` + `txRoute` (same pattern as 3.2 — verified manually via 6.2)
- [x] 5.3 Publish `resource.created`/`resource.capacity_set` domain events via `OutboxEventPublisher` in the same transaction as each mutation, and register corresponding `audit` consumers in `registerAuditConsumers` (design.md D5) and verify a unit test on the use case asserts the correct event is published
- [x] 5.4 Register `resourceRouter` in `apps/backend/src/http/app.ts` and verify `GET /resources` responds through the running app

## 6. Cross-cutting verification

- [x] 6.1 Run the full backend test suite and verify it passes with no regressions to existing Foundation module tests
- [x] 6.2 Manually verify via `docker compose` + live Postgres (per the project's existing verification pattern from the Foundation change) that RLS actually blocks a cross-tenant query against each new table, not just the application-level filter
