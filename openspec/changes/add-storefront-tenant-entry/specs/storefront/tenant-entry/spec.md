## Purpose

Gives an anonymous consumer a public landing page for a tenant's storefront link, listing the tenant's Venues and routing to the right one, so a shared business link always has somewhere to land.

## ADDED Requirements

### Requirement: Tenant entry page lists venues
The system SHALL provide a public, account-less page at the tenant's storefront entry point that lists every Venue belonging to that tenant.

#### Scenario: Tenant with multiple venues shows a picker
- **WHEN** an unauthenticated consumer opens a tenant's storefront entry page and that tenant has two or more Venues
- **THEN** the page lists each Venue by name and links to that Venue's storefront page

### Requirement: Single-venue tenant skips the picker
The system SHALL route the consumer directly to a tenant's only Venue's storefront page, without an intermediate list, when that tenant has exactly one Venue.

#### Scenario: Tenant with one venue redirects
- **WHEN** an unauthenticated consumer opens a tenant's storefront entry page and that tenant has exactly one Venue
- **THEN** the system sends the consumer directly to that Venue's storefront page

### Requirement: Missing tenant or empty tenant shows a clear not-found state
The system SHALL show a clear, non-broken message instead of an empty or errored page when the tenant does not exist or has no Venues.

#### Scenario: Unknown tenant
- **WHEN** an unauthenticated consumer opens a storefront entry page for a tenant id that does not exist
- **THEN** the system shows a "not found" message and does not error or show a blank page

#### Scenario: Tenant with zero venues
- **WHEN** an unauthenticated consumer opens a storefront entry page for a tenant that has no Venues
- **THEN** the system shows a message indicating there is nothing to show yet, rather than an empty list

### Requirement: Tenant entry page is isolated by tenant
The system SHALL scope the tenant entry page to the tenant identified in the request and SHALL NOT list or link to another tenant's Venues.

#### Scenario: Entry page is isolated by tenant
- **WHEN** an unauthenticated consumer opens Organization A's storefront entry page
- **THEN** the system lists only Organization A's Venues, never Organization B's
