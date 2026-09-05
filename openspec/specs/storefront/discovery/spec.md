# storefront/discovery Specification

## Purpose

Gives an anonymous consumer a public, cross-tenant search over Organizations (tenants) by approximate name - the platform's first storefront read that is not scoped to a single tenant - so a consumer who knows or roughly remembers a tenant's name can find it without a prior link.

## Requirements

### Requirement: Tenant discovery search is public and cross-tenant
The system SHALL provide a public, account-less search over Organizations (tenants) by approximate name match, returning only tenants that meet the tenant discovery eligibility rule, unlike every other storefront read which is scoped to a single tenant.

#### Scenario: Search returns eligible tenants matching the query
- **WHEN** an unauthenticated consumer searches by an approximate tenant name
- **THEN** the system returns eligible Organizations (per the tenant discovery eligibility rule) whose name approximately matches the query, each with its name and a link to its tenant entry page

#### Scenario: Approximate match tolerates accents and minor differences
- **WHEN** an unauthenticated consumer searches for "bar do joao"
- **THEN** the system returns an Organization named "Bar do João" among the results

### Requirement: Tenant discovery eligibility rule
The system SHALL include an Organization in tenant discovery search results only when it has at least one Venue that is `published = true`, has `coverPhotoUrl` set, and has at least one Product visible on the `storefront` channel and available at the current time (the same visibility rule defined in `storefront/catalog`), evaluated independently of any facet filter narrowing applied on top.

#### Scenario: Tenant with at least one eligible venue is included
- **WHEN** an Organization has at least one Venue with `published = true`, a non-empty `coverPhotoUrl`, and at least one Product visible on the `storefront` channel and available at the current time
- **THEN** the Organization appears in tenant discovery search results when it also matches any active name query and facet filters

#### Scenario: Tenant with no eligible venue is excluded
- **WHEN** an Organization has no Venue meeting the eligibility criteria (none published, none with a cover photo, or none with an available product)
- **THEN** the Organization is excluded from tenant discovery search results regardless of name match or facet filters

### Requirement: Discovery results link to the showcase page
Each Organization returned by a tenant discovery search SHALL include a link to that tenant's entry page.

#### Scenario: Search result links to showcase page
- **WHEN** a tenant discovery search returns an Organization
- **THEN** that result includes a link to the tenant's entry page (`storefront/tenant-entry`), identified by its tenant slug

### Requirement: Discovery search supports combinable facet filters
The system SHALL allow a tenant discovery search to be narrowed by any combination of: category, a "when" value (today, this weekend, or a specific date), availability ("has room now" vs. "include sold out"), and a maximum price, in addition to the existing approximate name match. Each filter SHALL be optional.

#### Scenario: Search combines name and category filter
- **WHEN** an unauthenticated consumer searches with a name query and a category filter
- **THEN** the system returns only eligible Organizations matching both the name and the category

#### Scenario: Search with no filters returns the default browse set
- **WHEN** an unauthenticated consumer requests discovery results with no name query and no filters
- **THEN** the system returns eligible Organizations without narrowing, ordered per the default sort (Requirement: Discovery results sort by distance by default)

#### Scenario: Availability filter excludes sold-out results by default
- **WHEN** a consumer has not enabled "include sold out"
- **THEN** the system excludes Organizations whose only eligible offer today has zero remaining capacity

#### Scenario: Price filter excludes results above the ceiling
- **WHEN** a consumer sets a maximum price
- **THEN** the system excludes Organizations whose lowest available price today exceeds that maximum

### Requirement: Discovery search returns category facet counts
Alongside search results, the system SHALL return, for each category, the count of results that would match if every currently active filter except that category filter were applied.

#### Scenario: Facet counts reflect other active filters
- **WHEN** a consumer has an availability filter active and no category filter selected
- **THEN** each category's returned count reflects only results matching the availability filter, not the unfiltered total

#### Scenario: Selecting a category does not collapse its own count
- **WHEN** a consumer selects the "Bares" category
- **THEN** the "Bares" facet count shown continues to reflect results without the category filter applied to itself, not the post-selection result count

### Requirement: Discovery results sort by distance by default
The system SHALL sort discovery results by ascending distance from a consumer-supplied approximate location (or a city-level default when none is supplied), using each eligible Venue's `latitude`/`longitude` when set.

#### Scenario: Results ordered nearest first
- **WHEN** an unauthenticated consumer supplies an approximate location
- **THEN** discovery results are ordered from nearest to farthest eligible Venue

#### Scenario: Venue without coordinates sorts last
- **WHEN** an eligible Organization's venues have no `latitude`/`longitude` set
- **THEN** that Organization sorts after every Organization with a computable distance, rather than causing an error

### Requirement: Discovery results include price, capacity, and verification signals
Each discovery result SHALL include, in addition to its name and tenant-entry link: the tenant's `verified` flag, the lowest current price across its eligible venues' storefront-visible products, and an aggregate capacity percentage computed per the "most-relevant-offer" rule (design.md D4).

#### Scenario: Result includes price-from and capacity
- **WHEN** a tenant discovery search returns an eligible Organization
- **THEN** the result includes that Organization's `verified` flag, lowest current price, and aggregate capacity percentage

#### Scenario: Organization with no computable capacity omits the figure
- **WHEN** an eligible Organization has no resource-backed product with a currently available period
- **THEN** the result omits the capacity percentage rather than showing a zero or error
