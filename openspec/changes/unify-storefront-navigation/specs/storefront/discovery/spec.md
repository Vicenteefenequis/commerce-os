## ADDED Requirements

### Requirement: Tenant discovery search is public and cross-tenant
The system SHALL provide a public, account-less search over Organizations (tenants) by approximate name match, returning only tenants that meet the tenant discovery eligibility rule, unlike every other storefront read which is scoped to a single tenant.

#### Scenario: Search returns eligible tenants matching the query
- **WHEN** an unauthenticated consumer searches by an approximate tenant name
- **THEN** the system returns eligible Organizations (per the tenant discovery eligibility rule) whose name approximately matches the query, each with its name and a link to its tenant entry page

#### Scenario: Approximate match tolerates accents and minor differences
- **WHEN** an unauthenticated consumer searches for "bar do joao"
- **THEN** the system returns an Organization named "Bar do João" among the results

### Requirement: Tenant discovery eligibility rule
The system SHALL include an Organization in tenant discovery search results only when it has at least one Venue that is `published = true`, has `coverPhotoUrl` set, and has at least one Product visible on the `storefront` channel and available at the current time (the same visibility rule defined in `storefront/catalog`).

#### Scenario: Tenant with at least one eligible venue is included
- **WHEN** an Organization has at least one Venue with `published = true`, a non-empty `coverPhotoUrl`, and at least one Product visible on the `storefront` channel and available at the current time
- **THEN** the Organization appears in tenant discovery search results when its name matches the query

#### Scenario: Tenant with no eligible venue is excluded
- **WHEN** an Organization has no Venue meeting the eligibility criteria (none published, none with a cover photo, or none with an available product)
- **THEN** the Organization is excluded from tenant discovery search results regardless of name match

## MODIFIED Requirements

### Requirement: Discovery results link to the showcase page
Each Organization returned by a tenant discovery search SHALL include a link to that tenant's entry page.

#### Scenario: Search result links to showcase page
- **WHEN** a tenant discovery search returns an Organization
- **THEN** that result includes a link to the tenant's entry page (`storefront/tenant-entry`), identified by its tenant slug

## REMOVED Requirements

### Requirement: Discovery search is public and cross-tenant
**Reason**: Discovery no longer searches Venues; it searches Organizations (tenants) by approximate name. Replaced by "Tenant discovery search is public and cross-tenant".
**Migration**: None required for consumers — see the new "Tenant discovery search is public and cross-tenant" requirement.

### Requirement: Discovery eligibility rule
**Reason**: Eligibility now applies at the Organization (tenant) level rather than per-Venue, since search results are tenants. Replaced by "Tenant discovery eligibility rule".
**Migration**: None required — the underlying criteria (published, cover photo, available product) are unchanged, just evaluated per-tenant instead of per-venue.

### Requirement: Discovery search filters by city and category
**Reason**: Discovery is no longer an exploratory cross-tenant venue browse; it is a direct search for a known or approximately-named tenant. City/category narrowing applied to venues, which are no longer the unit returned by discovery search.
**Migration**: None required for consumers — venue-level detail (category, city, address) is now shown after the consumer reaches a tenant's venue list or the merged venue page (`storefront/tenant-entry`, `storefront/checkout`), not as a pre-filter on the search itself.
