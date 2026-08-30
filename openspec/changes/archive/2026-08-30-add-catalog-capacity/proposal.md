## Why

The Foundation layer (organization, venue, identity, authorization, configuration, audit) is in place, but a venue still cannot sell anything: there is no product to sell and no notion of how much capacity exists to sell it against. Catalog and Capacity are the next slice in the PRD's recommended spec order (docs/prd.md §40, items 3-4) and are prerequisites for Availability, Reservation, Order, and Checkout.

## What Changes

- Introduce Product as a sellable entity scoped to a Venue: name, variants, price, availability window, channel rules (PRD CAT-001..005).
- Introduce Resource as the capacity-controlled entity a Product consumes: max capacity, capacity that can vary by period, and system-calculated available capacity (PRD CAP-001..004).
- Enforce hard-capacity overbooking prevention when a Resource is configured as hard capacity (PRD CAP-005).
- Both Product and Resource are tenant-owned: creation, read, and mutation follow the same organization-scoped RBAC and audit pattern already established by Venue.

Out of scope for this change (deferred to the next slice, Reservation/Availability per PRD §40 items 5-6):
- Temporary capacity holds during checkout (CAP-006/007).
- Cross-resource/cross-product availability querying (`/availability` endpoint).
- Pricing rules beyond a single price per product variant (offers, discounts, channel-specific pricing beyond a simple channel flag).

## Capabilities

### New Capabilities
- `catalog/product`: Sellable products owned by a Venue — creation, variants, price, availability window, channel visibility.
- `capacity/resource`: Capacity-controlled resources owned by a Venue — creation, max capacity, capacity by period, available-capacity calculation, hard-capacity enforcement.

### Modified Capabilities
(none — this change is additive and does not alter existing Foundation requirements)

## Impact

- New backend modules: `apps/backend/src/modules/catalog`, `apps/backend/src/modules/capacity` (hexagonal: domain/application/infrastructure, mirroring the `venue` module).
- New tables + RLS policies: `products`, `product_variants`, `resources`, `resource_capacity_periods` (or equivalent), all tenant-scoped like existing Foundation tables.
- New routes: `POST/GET /products`, `PATCH /products/:id`, `POST/GET /resources`, `PUT /resources/:id/capacity`.
- New permissions: `product:manage`, `product:read`, `resource:manage`, `resource:read`, wired into the existing `authorization` module's permission table.
- Audit entries for product and resource mutations, per the existing `audit` module pattern.
- No changes to Foundation specs or existing endpoints.
