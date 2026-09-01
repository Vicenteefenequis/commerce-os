## Purpose

Gives an anonymous consumer read-only access to a tenant's storefront-visible venues, products, prices, and resource availability, so they can decide what to buy before checkout requires no account at all.

## ADDED Requirements

### Requirement: Storefront venue listing is public
The system SHALL allow an unauthenticated request to list a tenant's Venues.

#### Scenario: Listing venues without authentication
- **WHEN** an unauthenticated request lists Venues for a tenant
- **THEN** the system returns every Venue belonging to that tenant

### Requirement: Storefront product listing respects channel visibility and availability window
The system SHALL allow an unauthenticated request to list a Venue's Products, returning only Products that are visible on the `storefront` channel and available at the current time, with their variants and current prices.

#### Scenario: Visible, available product is listed
- **WHEN** an unauthenticated request lists a Venue's Products
- **THEN** the system includes Products whose channel whitelist is empty or includes `storefront`, and whose availability window (if set) contains the current time, along with each variant's id, name, and current price

#### Scenario: Product hidden from the storefront channel is excluded
- **WHEN** a Product's channel whitelist is non-empty and does not include `storefront`
- **THEN** the system excludes that Product from the storefront listing

#### Scenario: Product outside its availability window is excluded
- **WHEN** the current time is before a Product's `availableFrom` or after its `availableUntil`
- **THEN** the system excludes that Product from the storefront listing

### Requirement: Storefront availability lookup is public
The system SHALL allow an unauthenticated request to look up available capacity for a resource-backed variant and period, using the same calculation the rest of the system relies on to prevent overbooking.

#### Scenario: Available capacity is returned for a resource-backed variant
- **WHEN** an unauthenticated request looks up availability for a variant that references a Resource, for a given period
- **THEN** the system returns the same available capacity figure `capacity/resource`'s calculation would produce for that Resource and period

#### Scenario: Variant without a resource has no capacity constraint
- **WHEN** an unauthenticated request looks up availability for a variant that references no Resource
- **THEN** the system reports no capacity constraint for that variant

### Requirement: Storefront reads are isolated by tenant
The system SHALL scope every storefront read to the tenant identified in the request and SHALL NOT return another tenant's Venues, Products, or availability.

#### Scenario: Storefront read is isolated by tenant
- **WHEN** an unauthenticated request for Organization A's storefront is made
- **THEN** the system returns only Organization A's data, never Organization B's
