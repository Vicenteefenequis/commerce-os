## MODIFIED Requirements

### Requirement: Scanning requires the entitlement:consume permission
Scan requests SHALL be authorized server-side and denied for any identity lacking the `entitlement:consume` permission for the request's Venue, regardless of frontend restrictions. An Admin holds this permission for every Venue in their Organization; a Validador holds it only for the Venue(s) their role assignment is scoped to.

#### Scenario: Identity without permission attempts a scan
- **WHEN** an identity lacking `entitlement:consume` for any Venue sends a scan request directly to the API
- **THEN** the system denies the request

#### Scenario: Admin scans for any Venue
- **WHEN** an identity holding the Admin role sends a scan request for any Venue in their Organization
- **THEN** the system evaluates the scan as already specified

#### Scenario: Validador scans for their assigned Venue
- **WHEN** an identity holding the Validador role scoped to Venue A sends a scan request for Venue A
- **THEN** the system evaluates the scan as already specified

#### Scenario: Validador is denied for a Venue they are not assigned to
- **WHEN** an identity holding the Validador role scoped to Venue A sends a scan request for Venue B
- **THEN** the system denies the request without evaluating the Ticket
