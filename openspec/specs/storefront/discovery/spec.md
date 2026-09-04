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
The system SHALL include an Organization in tenant discovery search results only when it has at least one Venue that is `published = true`, has `coverPhotoUrl` set, and has at least one Product visible on the `storefront` channel and available at the current time (the same visibility rule defined in `storefront/catalog`).

#### Scenario: Tenant with at least one eligible venue is included
- **WHEN** an Organization has at least one Venue with `published = true`, a non-empty `coverPhotoUrl`, and at least one Product visible on the `storefront` channel and available at the current time
- **THEN** the Organization appears in tenant discovery search results when its name matches the query

#### Scenario: Tenant with no eligible venue is excluded
- **WHEN** an Organization has no Venue meeting the eligibility criteria (none published, none with a cover photo, or none with an available product)
- **THEN** the Organization is excluded from tenant discovery search results regardless of name match

### Requirement: Discovery results link to the showcase page
Each Organization returned by a tenant discovery search SHALL include a link to that tenant's entry page.

#### Scenario: Search result links to showcase page
- **WHEN** a tenant discovery search returns an Organization
- **THEN** that result includes a link to the tenant's entry page (`storefront/tenant-entry`), identified by its tenant slug
