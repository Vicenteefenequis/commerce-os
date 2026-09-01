## Context

See proposal.md for motivation. `Product.isVisibleOnChannel(channel)` and `Product.isAvailableAt(date)` already exist on the domain entity (`apps/backend/src/modules/catalog/domain/product.entity.ts`) - this change is the first thing that actually calls them from a public path. `GetAvailableCapacityUseCase` (`apps/backend/src/modules/capacity/application/get-available-capacity.usecase.ts`) already computes available capacity for the admin resource-detail screen; nothing about that calculation changes.

## Goals / Non-Goals

**Goals:**
- A consumer can list a tenant's Venues, a Venue's visible/available Products with prices, and a variant's availability - all without authentication.

**Non-Goals:**
- No search/filtering beyond "this venue's visible products" - a pilot has few enough products for this not to be a UX problem yet.
- No admin UI to manage which channel a Product is visible on - that already exists via `PATCH /products/:id`'s `channels` field, unchanged by this proposal.
- No pagination - same posture as the existing `GET /orders`/`GET /venues` admin lists (M3/M6), revisit if it becomes a measured problem.

## Decisions

- **Public catalog endpoints live in a new `apps/backend/src/modules/storefront` module**, not bolted onto `catalog`/`capacity`/`venue`. Those modules' existing controllers are staff-only by design (admin-shaped data, permission-gated); the storefront needs a narrower, public-shaped read (only visible/available products, only prices and names, no cost data). A separate module keeps that public/private boundary explicit at the routing layer rather than as a conditional inside an existing controller. It composes the existing repositories/use cases rather than duplicating queries.
- **`storefront` is the fixed channel name** a Product must be visible on (or have an empty `channels` list) to appear. Chosen over a configurable channel name because nothing in the domain model needs more than one public channel yet (YAGNI) - `isVisibleOnChannel` already supports arbitrary channel strings if that changes later.
- **Tenant id is a path parameter, not inferred from a session** - there is no session on a public read. This mirrors the existing public payment page's `?tenantId=` convention (`apps/web/app/pay/[orderId]`), so no new "resolve tenant from a public identifier" concept is introduced.
- **No new tables, no caching layer.** At pilot scale (PRD §37 R1) the same queries the admin screens already run are fast enough for public read too.

## Risks / Trade-offs

- [A public, unauthenticated catalog-read surface is new attack surface] → mitigated by it being read-only, tenant-scoped by the `tenantId` already in the URL (same trust boundary as the existing public checkout/pay endpoints), and returning only what `isVisibleOnChannel`/`isAvailableAt` already gate.
