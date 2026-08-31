## Why

M1 (`capacity/reservation`) closed the capacity hold lifecycle, but there is still no way for a customer to actually buy something: no `Order` entity, no checkout flow, and no link between a `Product`/`Variant` and the `Resource` whose capacity it should hold. Without this, the MVP cannot reach its first payment milestone (M3) or the "primeiro visitante entrando" milestone (M5) — both depend on an Order existing first.

## What Changes

- Add a `resourceId` (optional, fixed 1:1) field to `ProductVariant`, linking a variant to the `Resource` whose capacity it consumes. A variant without `resourceId` does not hold capacity (e.g. a product without capacity control).
- Add an `Order` entity with explicit lifecycle: `draft → awaiting_payment → paid → fulfilled → partially_refunded → refunded → cancelled → expired` (ORD-001), with every state change recorded (ORD-002) and a snapshot of the commercial terms (price, variant name) used at purchase time (ORD-003).
- Add a checkout flow that creates an `Order` from a cart without requiring account creation (CHK-001), recalculates all prices server-side rather than trusting client input (CHK-004), opens a `Reservation` (via the existing `CreateReservationUseCase`) for each order line whose variant has a `resourceId`, and guards against accidental duplicate order creation (CHK-005).
- Add a public checkout API surface (no `apps/web` storefront UI in this change — see Impact).

## Capabilities

### New Capabilities
- `commerce/order`: Order entity, lifecycle, state history, and commercial-terms snapshot (ORD-001/002/003).
- `commerce/checkout`: Account-less, mobile-first checkout that turns a cart into an `Order` with server-recalculated pricing, capacity holds, and duplicate-order prevention (CHK-001/002/004/005). CHK-003 (what the customer sees) is a UI concern deferred to the storefront UI, out of scope here.

### Modified Capabilities
- `catalog/product`: add the optional `resourceId` requirement on `ProductVariant` — a variant may reference at most one `Resource`, fixed for the life of the variant.

## Impact

- **Backend**: new `apps/backend/src/modules/commerce/` (or similar) module for `order` and `checkout`; migration adding `orders`, `order_lines` tables and a `resource_id` column on the existing variant table; `catalog/product` domain/ports/infrastructure touched to carry `resourceId`; checkout use case depends on `capacity/reservation`'s `CreateReservationUseCase`.
- **No frontend in this change**: `apps/web` has no public storefront today (only `(marketing)` and `admin`); building that UI is left to a follow-up change once the checkout API exists.
- **Depends on**: `capacity/reservation` (M1, already implemented) for capacity holds.
- **Blocks**: M3 (Payment) — payment confirmation transitions `Order.status`, so Payment cannot start until `Order` exists.
