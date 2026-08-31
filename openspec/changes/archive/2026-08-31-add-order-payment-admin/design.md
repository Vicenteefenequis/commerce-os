## Context

See proposal.md - Why. Relevant existing surface:

- `apps/backend/src/modules/commerce/infrastructure/order.controller.ts` - `getOrderController` returns a single Order via `KyselyOrderRepository.findById`; no list query exists on the repository.
- `apps/backend/src/modules/payments/infrastructure/payment-repository.kysely.ts` - `findActiveByOrderId(tenantId, orderId)` already exists and returns the most recent non-`failed` Payment for an Order.
- `order:manage` and `payment:manage` permissions already gate cancel/fulfill and refund respectively (owner/admin roles).
- Admin list/detail screens (`apps/web/app/admin/venues`) follow: Server Component page does a server-side `backendFetch` for reads, a `*-content.tsx` Client Component renders the table/detail and owns dialog state, `actions.ts` Server Actions call the backend and `revalidatePath`.

## Goals / Non-Goals

**Goals:**
- One backend round trip for the order detail screen (order + its active payment together).
- Reuse the existing list/detail/Server Action admin pattern exactly, no new UI conventions.

**Non-Goals:**
- Filtering, sorting, search, or pagination of the order list (explicitly deferred per proposal).
- Payment history (multiple past `failed` Payments) - only the active Payment is shown.
- Editing order lines or issuing new payments from the admin.

## Decisions

- **`GET /orders` returns the full tenant order set, unfiltered.** Matches the explicit v1 scope (see proposal.md). Add a `KyselyOrderRepository.findAllByTenant(tenantId)` method mirroring `findById`'s query shape.
- **Active payment is embedded in the existing `GET /orders/:id` response**, not a new `GET /payments?orderId=` endpoint. `findActiveByOrderId` already does the right lookup; adding it to `getOrderController`'s `serializeOrder` avoids a second network round trip in the detail screen and keeps "one screen, one fetch" consistent with `admin/data-fetching`'s server-side-read requirement. The order list response does NOT embed payment (would require N+1 lookups); only the detail does.
- **Detail screen composes existing action endpoints, not new ones.** Cancel (`POST /orders/:id/cancel`), fulfill (`POST /orders/:id/fulfill`), and refund (`POST /payments/:id/refund`) already exist and already carry the right permission checks and status-transition guards; the admin Server Actions call them directly.
- **Refund amount**: v1 offers full refund only (no partial-amount input), calling `POST /payments/:id/refund` with the Payment's full remaining amount. Partial refunds are a real backend capability but adding an amount input is additional UI surface not requested; can be a follow-up change.

## Risks / Trade-offs

- [Unfiltered order list could become slow/unwieldy as order volume grows] -> Deferred deliberately per proposal; scoped as a known limitation, not silently dropped. A follow-up change can add pagination/filtering once volume warrants it.
- [Embedding payment in order detail couples the two serializers] -> Acceptable: the spec (`commerce/order` - "Order detail exposes its active payment") makes this coupling an explicit, tested contract rather than an implementation accident.
