# foundation/venue Specification

## Purpose

Represents a physical establishment (e.g. a zoo, a museum, a park) belonging to an Organization, and the anchor point later phases will attach capacity, catalog, and access-control data to.

## Requirements

### Requirement: Venue creation under an organization
The system SHALL allow an authorized actor to create a Venue that belongs to exactly one Organization, with a unique, URL-safe slug within that Organization. A newly created Venue SHALL default to unpublished (`published = false`) with no profile fields set.

#### Scenario: Successful venue creation
- **WHEN** an authorized actor submits venue details (name, at minimum) for an existing Organization
- **THEN** the system creates a new Venue associated with that Organization, with a slug unique within that Organization, `published` set to `false`, and no profile fields set

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
A Venue SHALL be readable and writable only by identities authorized within its owning Organization, except for the public profile fields exposed read-only through the `storefront/showcase` and `storefront/discovery` capabilities.

#### Scenario: Venue is isolated by tenant
- **WHEN** a user from Organization A attempts to read or modify a Venue belonging to Organization B
- **THEN** the system denies the operation

### Requirement: Venue profile fields are owner-editable
The system SHALL allow an authorized actor within a Venue's owning Organization to set and update that Venue's profile: `description`, `address`, `city`, `category` (each free text, optional), and `coverPhotoUrl` (optional, must be a well-formed URL when set).

#### Scenario: Owner updates profile fields
- **WHEN** an authorized actor within the Venue's Organization submits new values for `description`, `address`, `city`, `category`, and/or `coverPhotoUrl`
- **THEN** the system updates the Venue with those values

#### Scenario: Malformed cover photo URL is rejected
- **WHEN** an authorized actor submits a `coverPhotoUrl` value that is not a well-formed URL
- **THEN** the system rejects the update and the Venue's stored `coverPhotoUrl` is unchanged

#### Scenario: Actor outside the owning organization cannot edit profile
- **WHEN** an actor not authorized within the Venue's owning Organization attempts to update its profile fields
- **THEN** the system denies the operation and no field is changed

### Requirement: Venue publish toggle is owner-controlled
The system SHALL allow an authorized actor within a Venue's owning Organization to set the Venue's `published` flag to `true` or `false` independently of its other profile fields, and SHALL default `published` to `false` for every Venue until explicitly set.

#### Scenario: Owner publishes a venue
- **WHEN** an authorized actor within the Venue's Organization sets `published` to `true`
- **THEN** the system updates the Venue's `published` flag to `true`

#### Scenario: Owner unpublishes a venue
- **WHEN** an authorized actor within the Venue's Organization sets `published` to `false`
- **THEN** the system updates the Venue's `published` flag to `false`

#### Scenario: Publish flag does not gate direct access
- **WHEN** a Venue has `published = false`
- **THEN** the Venue's showcase and purchase pages remain reachable by direct link, since `published` only controls inclusion in `storefront/discovery` search results

### Requirement: Venue location coordinates are owner-editable
The system SHALL allow an authorized actor within a Venue's owning Organization to set and update that Venue's `latitude` and `longitude` (each optional, numeric, and valid geographic coordinates when set), independently of its other profile fields.

#### Scenario: Owner sets venue coordinates
- **WHEN** an authorized actor within the Venue's Organization submits valid `latitude` and `longitude` values
- **THEN** the system updates the Venue with those coordinates

#### Scenario: Invalid coordinates are rejected
- **WHEN** an authorized actor submits a `latitude` outside [-90, 90] or a `longitude` outside [-180, 180]
- **THEN** the system rejects the update and the Venue's stored coordinates are unchanged

#### Scenario: Venue without coordinates is valid
- **WHEN** a Venue has never had `latitude`/`longitude` set
- **THEN** the system treats it as a venue with unknown location, without error, for any read that uses location
