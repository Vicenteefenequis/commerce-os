## ADDED Requirements

### Requirement: Venue listing is scoped to the caller's assigned Venue(s)
Listing an Organization's Venues SHALL return every Venue in the Organization for an Admin, and only the Venue(s) a Gerente/Vendedor/Validador's role assignment(s) are scoped to for any other role.

#### Scenario: Admin lists every Venue
- **WHEN** an identity holding the Admin role lists Venues for their Organization
- **THEN** the system returns every Venue belonging to that Organization

#### Scenario: Gerente lists only their assigned Venue
- **WHEN** an identity holding the Gerente role scoped to Venue A lists Venues for their Organization
- **THEN** the system returns only Venue A, even when the Organization has other Venues
