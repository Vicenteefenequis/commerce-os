## Purpose

Represents a physical establishment (e.g. a zoo, a museum, a park) belonging to an Organization, and the anchor point later phases will attach capacity, catalog, and access-control data to.

## ADDED Requirements

### Requirement: Venue creation under an organization
The system SHALL allow an authorized actor to create a Venue that belongs to exactly one Organization.

#### Scenario: Successful venue creation
- **WHEN** an authorized actor submits venue details (name, at minimum) for an existing Organization
- **THEN** the system creates a new Venue associated with that Organization

#### Scenario: Venue cannot be created without a parent organization
- **WHEN** venue creation is attempted referencing an Organization that does not exist or does not belong to the acting tenant
- **THEN** the system rejects the operation and no Venue is created

### Requirement: Venue belongs to a single tenant
A Venue SHALL be readable and writable only by identities authorized within its owning Organization.

#### Scenario: Venue is isolated by tenant
- **WHEN** a user from Organization A attempts to read or modify a Venue belonging to Organization B
- **THEN** the system denies the operation
