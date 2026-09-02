# foundation/venue Specification

## Purpose

Represents a physical establishment (e.g. a zoo, a museum, a park) belonging to an Organization, and the anchor point later phases will attach capacity, catalog, and access-control data to.

## Requirements

### Requirement: Venue creation under an organization
The system SHALL allow an authorized actor to create a Venue that belongs to exactly one Organization, with a unique, URL-safe slug within that Organization.

#### Scenario: Successful venue creation
- **WHEN** an authorized actor submits venue details (name, at minimum) for an existing Organization
- **THEN** the system creates a new Venue associated with that Organization, with a slug unique within that Organization

#### Scenario: Venue cannot be created without a parent organization
- **WHEN** venue creation is attempted referencing an Organization that does not exist or does not belong to the acting tenant
- **THEN** the system rejects the operation and no Venue is created

#### Scenario: Slug collision within the same organization is rejected
- **WHEN** venue creation is submitted with a slug that already belongs to another Venue of the same Organization
- **THEN** the system rejects the operation and no Venue is created

#### Scenario: Same slug is allowed across different organizations
- **WHEN** two different Organizations each create a Venue using the same slug
- **THEN** both Venues are created successfully, since Venue slug uniqueness is scoped to the owning Organization

### Requirement: Venue belongs to a single tenant
A Venue SHALL be readable and writable only by identities authorized within its owning Organization.

#### Scenario: Venue is isolated by tenant
- **WHEN** a user from Organization A attempts to read or modify a Venue belonging to Organization B
- **THEN** the system denies the operation
