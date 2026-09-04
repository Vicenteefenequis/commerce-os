## MODIFIED Requirements

### Requirement: Storefront product listing respects channel visibility and availability window
The system SHALL allow an unauthenticated request to list a Venue's Products, identified by the tenant's slug and the venue's slug, returning only Products that are visible on the `storefront` channel and available at the current time, with their variants, current prices, and — for each Product with at least one resource-backed variant — an aggregate capacity percentage computed from those variants' Resources.

#### Scenario: Visible, available product is listed
- **WHEN** an unauthenticated request lists a Venue's Products, identified by tenant slug and venue slug
- **THEN** the system includes Products whose channel whitelist is empty or includes `storefront`, and whose availability window (if set) contains the current time, along with each variant's id, name, and current price

#### Scenario: Product hidden from the storefront channel is excluded
- **WHEN** a Product's channel whitelist is non-empty and does not include `storefront`
- **THEN** the system excludes that Product from the storefront listing

#### Scenario: Product outside its availability window is excluded
- **WHEN** the current time is before a Product's `availableFrom` or after its `availableUntil`
- **THEN** the system excludes that Product from the storefront listing

#### Scenario: Unknown venue slug returns not found
- **WHEN** an unauthenticated request lists Products for a venue slug that does not match any Venue of the tenant identified by the tenant slug
- **THEN** the system returns a not-found result and no Product data

#### Scenario: Product with resource-backed variants includes an aggregate capacity figure
- **WHEN** the storefront product listing includes a Product with one or more variants that reference a Resource
- **THEN** the response includes an aggregate capacity percentage for that Product, computed from those variants' Resources using the same calculation as `capacity/resource`

#### Scenario: Product without resource-backed variants omits the capacity figure
- **WHEN** a listed Product has no variant referencing a Resource
- **THEN** the response omits the aggregate capacity figure for that Product rather than showing zero
