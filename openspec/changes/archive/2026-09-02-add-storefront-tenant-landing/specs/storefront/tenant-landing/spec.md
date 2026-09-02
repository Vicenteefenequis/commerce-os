## Purpose

Presents a tenant's Venues as a public landing page — the "areas" a customer can choose from (e.g. a zoo's "Savana Africana", "Aquário") — using the tenant's slug as the entry point of that tenant's storefront, before the buyer reaches any single Venue's product listing.

## ADDED Requirements

### Requirement: Public tenant landing page
The system SHALL provide a public, account-less page at `/loja/[tenantSlug]` that presents a tenant's Venues as the entry point of that tenant's storefront.

#### Scenario: Tenant landing page lists venues
- **WHEN** a visitor requests the tenant landing page for a valid tenant slug
- **THEN** the page displays the tenant's name and every Venue belonging to that tenant, each linking to that Venue's product listing page

#### Scenario: Unknown tenant slug shows a clear not-found state
- **WHEN** a visitor requests the tenant landing page for a slug that matches no Organization
- **THEN** the page shows a clear "not found" message instead of an empty or broken page

#### Scenario: Tenant with no venues shows a clear empty state
- **WHEN** a visitor requests the tenant landing page for a tenant that has no Venues yet
- **THEN** the page shows a clear message that no venues are available instead of an empty list
