## MODIFIED Requirements

### Requirement: Organization creation
The system SHALL allow creation of a new Organization with a unique identifier and a unique, URL-safe slug, and SHALL only allow this operation to be performed by an authenticated platform admin (see foundation/platform-admin).

#### Scenario: Successful organization creation
- **WHEN** an authenticated platform admin submits organization details (name, at minimum)
- **THEN** the system creates a new Organization with a unique tenant identifier, a unique slug derived from or supplied alongside the name, and persists it

#### Scenario: Slug collision is rejected
- **WHEN** organization creation is submitted with a slug that already belongs to another Organization
- **THEN** the system rejects the operation and no Organization is created

#### Scenario: Unauthenticated creation attempt is rejected
- **WHEN** a request to create an Organization is made without a valid platform admin session
- **THEN** the system rejects the request and no Organization is created
