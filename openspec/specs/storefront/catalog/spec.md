## Purpose

Gives an anonymous consumer read-only access to a tenant's storefront-visible venues, products, prices, and resource availability, so they can decide what to buy before checkout requires no account at all.

## Requirements

### Requirement: Storefront venue listing is public
The system SHALL allow an unauthenticated request to list a tenant's Venues, identified by the tenant's slug.

#### Scenario: Listing venues without authentication
- **WHEN** an unauthenticated request lists Venues for a tenant identified by its slug
- **THEN** the system returns every Venue belonging to that tenant

#### Scenario: Unknown tenant slug returns not found
- **WHEN** an unauthenticated request lists Venues for a slug that does not match any Organization
- **THEN** the system returns a not-found result and no Venue data

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

### Requirement: Storefront availability lookup is public
The system SHALL allow an unauthenticated request to look up available capacity for a resource-backed variant and period, identified by the tenant's slug and the venue's slug, using the same calculation the rest of the system relies on to prevent overbooking.

#### Scenario: Available capacity is returned for a resource-backed variant
- **WHEN** an unauthenticated request looks up availability for a variant that references a Resource, for a given period, identified by tenant slug and venue slug
- **THEN** the system returns the same available capacity figure `capacity/resource`'s calculation would produce for that Resource and period

#### Scenario: Variant without a resource has no capacity constraint
- **WHEN** an unauthenticated request looks up availability for a variant that references no Resource
- **THEN** the system reports no capacity constraint for that variant

### Requirement: Storefront venue listing includes the organization name
The system SHALL include the owning Organization's name alongside the Venue list returned by the storefront venue listing, so a consumer can see which business they are browsing.

#### Scenario: Venue listing includes the organization name
- **WHEN** an unauthenticated request lists Venues for a tenant that exists
- **THEN** the response includes that Organization's name in addition to its Venues

### Requirement: Storefront reads are isolated by tenant
The system SHALL scope every storefront read to the tenant identified in the request and SHALL NOT return another tenant's Venues, Products, or availability.

#### Scenario: Storefront read is isolated by tenant
- **WHEN** an unauthenticated request for Organization A's storefront is made
- **THEN** the system returns only Organization A's data, never Organization B's
