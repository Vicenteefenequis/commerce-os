## 1. Catalog: variant-resource link

- [x] 1.1 Add `resource_id` (nullable FK to `resources`, same tenant) migration on the product-variant table; verify migration runs up and down cleanly
- [x] 1.2 Add `resourceId` to `ProductVariantProps`/`ProductVariant` entity and to `ProductRepositoryPort` create/update paths; verify a variant can be created/updated with and without a `resourceId` (test)
- [x] 1.3 Expose `resourceId` on the variant read model returned by `GetProductUseCase`/`ListProductsUseCase`

## 2. Order domain and use cases

- [x] 2.1 Add `orders`, `order_lines`, `order_status_history` tables migration, enrolled in `TENANT_TABLES` RLS; verify migration runs up and down cleanly
- [x] 2.2 Add `Order`/`OrderLine` entities (`domain/order.entity.ts`) with status `draft | awaiting_payment | paid | fulfilled | partially_refunded | refunded | cancelled | expired`, each line carrying a snapshot (`variantId`, `name`, `unitPriceCents`, `quantity`) and an optional `reservationId`
- [x] 2.3 Add `OrderRepositoryPort` (create, findById, guarded status-transition update, append status-history row) to `domain/ports.ts`
- [x] 2.4 Add `CreateOrderUseCase`: recalculates each line's price from current variant data (spec: commerce/checkout - "Server recalculates price"), for each line whose variant has a `resourceId` calls `CreateReservationUseCase` to hold capacity, creates the Order + lines + Reservations in one transaction; on any Reservation rejection, rolls back and creates no Order; verify success and capacity-rejection paths (test, spec: commerce/checkout - "Checkout fails cleanly when capacity is unavailable")
- [x] 2.5 Add idempotency handling to `CreateOrderUseCase`: given a previously-seen idempotency key, return the existing Order instead of creating a new one; verify a retried submission does not create a second Order (test, spec: commerce/checkout - "Checkout prevents accidental duplicate orders")
- [x] 2.6 Add `TransitionOrderStatusUseCase` (or per-transition use cases, matching the `capacity/reservation` pattern): guarded transitions per ORD-001's lifecycle, writing an `order_status_history` row each time; verify an invalid transition (e.g. `paid → draft`) is rejected (test)
- [x] 2.7 Add `CancelOrderUseCase`: guarded `draft|awaiting_payment → cancelled` transition, releases every line's Reservation via `CancelReservationUseCase` in the same transaction; verify capacity is freed (test, spec: commerce/order - "Order cancellation releases held capacity")
- [x] 2.8 Publish `order.created` / `order.status_changed` / `order.cancelled` domain events via `OutboxEventPublisher` in each use case's transaction
- [x] 2.9 (added during implementation, not in original plan) Add a per-tenant reserved "checkout system user" (`infrastructure/system-user.kysely.ts`), lazily created: guest checkout (CHK-001) has no authenticated actor, but `audit_log.actor_user_id` is `NOT NULL` with a FK to `users`, so every guest-initiated Reservation/Order event needs a real user row to attribute audit entries to. Resolving `foundation/audit`'s constraint itself was out of this change's declared capabilities, so this stays local to commerce/checkout.

## 3. Audit

- [x] 3.1 Add audit consumer handlers for `order.*` events in `registerAuditConsumers`, recording actor, order id, and resulting status; verify an audit entry is written for a cancellation (test)

## 4. Infrastructure: routes

- [x] 4.1 Add `KyselyOrderRepository` implementing `OrderRepositoryPort`
- [x] 4.2 Add `checkout.controller.ts` and `checkout.routes.ts`: `POST /checkout` (public, no `requireAuth` — CHK-001), accepting cart lines + an idempotency key, invoking `CreateOrderUseCase`, wrapped in `txRoute`
- [x] 4.3 Add `order.controller.ts` and `order.routes.ts` for internal/admin order management: `GET /orders/:id`, `POST /orders/:id/cancel`, each behind `requireAuth` + `requirePermission("order:manage")` and `txRoute`
- [x] 4.4 Verify tenant isolation: a request scoped to Organization A cannot read or transition an Order belonging to Organization B (test, spec: commerce/order - "Order is isolated by tenant")

## 5. End-to-end verification

- [x] 5.1 Walk the full checkout-to-fulfillment path in an integration test: `POST /checkout` with a capacity-bound line and a capacity-free line → Order `draft`, one Reservation `pending` → transition to `paid` → transition to `fulfilled` — verify available capacity is held throughout
- [x] 5.2 Walk the cancellation path in an integration test: `POST /checkout` → `POST /orders/:id/cancel` → verify Order is `cancelled`, its Reservation is `cancelled`, and capacity is restored
- [x] 5.3 Verify duplicate-submission behavior end to end: two `POST /checkout` requests with the same idempotency key and body return the same Order id and only one Order/Reservation exists
