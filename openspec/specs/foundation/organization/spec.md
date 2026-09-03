# foundation/organization Specification

## Purpose

Represents the tenant boundary of the platform: a company that owns venues, products, configuration, and users, with data fully isolated from every other organization.

## Requirements

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

### Requirement: Multiple venues per organization
An Organization SHALL be able to own multiple Venues.

#### Scenario: Organization with several venues
- **WHEN** an Organization has two or more Venues associated with it
- **THEN** the system lists all Venues under that Organization without limit imposed by the domain model

### Requirement: Tenant data isolation
Data belonging to different Organizations SHALL remain isolated: no read or write operation may return or mutate data belonging to an Organization other than the one the acting identity belongs to.

#### Scenario: Cross-tenant read attempt is blocked
- **WHEN** a user authenticated under Organization A requests a resource (e.g. a Venue, a Customer) that belongs to Organization B
- **THEN** the system denies the request or returns a not-found result, and does not return any data from Organization B

#### Scenario: Isolation holds even if application-level filter is missing
- **WHEN** a query executes against the database without an explicit tenant filter due to an application bug
- **THEN** the database-level isolation mechanism (Row Level Security) still prevents rows from other Organizations from being returned

### Requirement: Organization-level configuration
An Organization SHALL possess its own configuration, independent of other Organizations' configuration.

#### Scenario: Configuration change is scoped to one organization
- **WHEN** an Organization's configuration is updated
- **THEN** no other Organization's configuration is affected
