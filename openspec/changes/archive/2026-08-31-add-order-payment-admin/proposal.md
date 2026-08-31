## Why

Staff have no way to see or act on orders and payments today. The backend exposes only `GET /orders/:id` (exact id) and no order listing, and no way to reach a Payment from its Order without querying by the Payment's own id. There is no admin screen for either. Support and operations staff need a single place to see all of a tenant's orders, drill into one with its payment, and cancel, fulfill, or refund it.

## What Changes

- Add `GET /orders` returning all Orders for the authenticated identity's tenant (no filtering/pagination in this version).
- Expose the Order's active Payment (if any) alongside the Order in the existing `GET /orders/:id` response, so the admin can see payment status without a second lookup by Payment id.
- Add an admin **Pedidos** section (`apps/web/app/admin/orders`) following the existing list -> detail admin pattern:
  - List screen: all tenant orders (id, venue, status, total).
  - Detail screen: order lines, embedded payment, and actions to cancel, fulfill, or refund, calling the existing `POST /orders/:id/cancel`, `POST /orders/:id/fulfill`, and `POST /payments/:id/refund` endpoints via Server Actions.

## Capabilities

### New Capabilities

(none - this change implements existing `commerce/order` and `payments/payment` capabilities as an admin screen, following the established `admin/design-system` and `admin/data-fetching` conventions used by venues/products/resources)

### Modified Capabilities

- `commerce/order`: new requirement that Orders can be listed by tenant, and that an Order's detail exposes its active Payment (if any) to authorized identities.
- `payments/payment`: new requirement that a Payment's full detail (not just status) is retrievable by an authorized identity as part of its Order, distinct from the existing unauthenticated status-only lookup by Payment id.

## Impact

- Backend: `apps/backend/src/modules/commerce` (new list query + repository method, updated order serialization), `apps/backend/src/modules/payments` (payment lookup reused via `findActiveByOrderId`, already exists).
- Frontend: new `apps/web/app/admin/orders/` (page, content, actions) following the pattern in `apps/web/app/admin/venues/`.
- No new permissions needed: `order:manage` and `payment:manage` already gate cancel/fulfill and refund respectively.
