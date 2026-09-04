## MODIFIED Requirements

### Requirement: Tenant entry page lists venues
The system SHALL provide a public, account-less page at `/loja/[tenantSlug]`, the tenant's storefront entry point identified by the tenant's slug, that lists every Venue belonging to that tenant as a card showing that Venue's photo, address, and category, alongside its name.

#### Scenario: Tenant with multiple venues shows a picker
- **WHEN** an unauthenticated consumer opens a tenant's storefront entry page (identified by tenant slug) and that tenant has two or more Venues
- **THEN** the page lists each Venue as a card with its cover photo, address, and category, alongside its name, and links to that Venue's storefront page, identified by the venue's slug

#### Scenario: Venue card omits unset fields
- **WHEN** a tenant's storefront entry page lists a Venue that has no cover photo, address, or category set
- **THEN** that Venue's card omits the missing field without showing an error or placeholder text implying missing data

## ADDED Requirements

### Requirement: Tenant entry page is reachable from tenant search results
The system SHALL route a consumer who selects an Organization from a `storefront/discovery` search result to that Organization's tenant entry page at `/loja/[tenantSlug]`.

#### Scenario: Selecting a search result opens the tenant entry page
- **WHEN** an unauthenticated consumer selects an Organization from tenant search results
- **THEN** the system navigates them to `/loja/[tenantSlug]` for that Organization
