## 1. Backend: order listing

- [x] 1.1 Add `findAllByTenant(tenantId)` to `KyselyOrderRepository`, mirroring `findById`'s query/hydration shape, and verify a unit/integration test returns every Order for a tenant and none from another tenant
- [x] 1.2 Add `GET /orders` to `order.routes.ts` gated by `requireAuth` + `requirePermission("order:manage")`, and a controller that calls `findAllByTenant` and serializes the list, verified by a request test asserting 200 with all tenant orders and tenant isolation

## 2. Backend: embed active payment in order detail

- [x] 2.1 Extend `getOrderController`'s `serializeOrder` (or its caller) to look up the Order's active Payment via `findActiveByOrderId` and include its id, status, method, amountCents, and refundedAmountCents in the response when present, verified by a test asserting the field is included for an Order with a pending/succeeded/refunded Payment
- [x] 2.2 Verify a test asserting the field is omitted (or null) for an Order with no Payment or only `failed` Payments

## 3. Admin UI: orders list

- [x] 3.1 Create `apps/web/app/admin/orders/page.tsx` as a Server Component calling `backendFetch("/orders")`, following `apps/web/app/admin/venues/page.tsx`'s pattern, verified by loading `/admin/orders` and seeing the full order list with no client-side fetch
- [x] 3.2 Create `orders-content.tsx` rendering a table (id, venue, status, total) linking each row to its detail screen, with the CRUD-list empty state per `admin/design-system`, verified by viewing the screen with zero and with several orders

## 4. Admin UI: order detail + actions

- [x] 4.1 Create `apps/web/app/admin/orders/[id]/page.tsx` as a Server Component calling `backendFetch("/orders/:id")`, verified by loading a specific order and seeing its lines and embedded payment
- [x] 4.2 Create `order-detail-content.tsx` showing lines, payment (status/method/amount/refunded), and Cancel/Fulfill/Refund buttons enabled per the Order/Payment's current status, verified visually against each relevant status
- [x] 4.3 Add `actions.ts` Server Actions `cancelOrder`, `fulfillOrder`, `refundPayment` calling the existing `POST /orders/:id/cancel`, `POST /orders/:id/fulfill`, `POST /payments/:id/refund` endpoints and `revalidatePath`-ing the detail route, verified by exercising each action end to end and confirming the screen reflects the new status without a manual reload
- [x] 4.4 Surface action failures (e.g. invalid transition, permission denied) as a non-blocking error per `admin/design-system`'s async-feedback requirement, verified by triggering an invalid transition (e.g. fulfilling a non-`paid` order) and seeing the error without a page reload

## 5. Navigation

- [x] 5.1 Add an "Pedidos" entry to `AdminNav` linking to `/admin/orders`, verified by navigating to it from the admin shell

## 6. Verification

- [x] 6.1 Run the backend test suite and confirm all new and existing order/payment tests pass
- [x] 6.2 Manually walk the flow end to end: list orders -> open one -> cancel/fulfill/refund -> confirm resulting status on both the detail screen and a fresh `GET /orders/:id`
