# foundation/authorization Specification

## Purpose

Determines what an authenticated identity is allowed to do within its Organization, enforced server-side on every sensitive operation.

## Requirements

### Requirement: Role-based access control
The system SHALL support the following roles: Admin, Gerente, Vendedor, Validador.

#### Scenario: User acts within their role's permissions
- **WHEN** a user with a given role attempts an operation permitted to that role
- **THEN** the system allows the operation

#### Scenario: User attempts an operation outside their role's permissions
- **WHEN** a user with a given role attempts an operation not permitted to that role
- **THEN** the system denies the operation

### Requirement: Role assignments bind Gerente, Vendedor, and Validador to exactly one Venue
A role assignment SHALL bind a role to a user within an Organization. An Admin assignment SHALL NOT be bound to a Venue and SHALL apply across every Venue belonging to that Organization. A Gerente, Vendedor, or Validador assignment SHALL be bound to exactly one Venue.

#### Scenario: Admin assignment applies to all venues
- **WHEN** a user holds an Admin role assignment for an Organization
- **THEN** that user is authorized for operations on every Venue belonging to that Organization

#### Scenario: Gerente, Vendedor, or Validador assignment is scoped to one Venue
- **WHEN** a user holds a Gerente, Vendedor, or Validador role assignment bound to a specific Venue
- **THEN** that user is authorized only for operations scoped to that Venue, not for any other Venue in the same Organization

#### Scenario: Assigning a non-Admin role without a Venue is rejected
- **WHEN** a Gerente, Vendedor, or Validador role assignment is created without specifying a Venue
- **THEN** the system rejects the assignment

#### Scenario: A user may hold more than one role assignment
- **WHEN** a user is assigned both the Vendedor and the Validador role for the same Venue
- **THEN** the system grants that user the permissions of both roles for that Venue

### Requirement: Permission checks validate Venue scope
Every permission check for an operation on a Venue-owned resource SHALL, in addition to the caller's Organization membership, validate that the caller holds a role assignment scoped to that resource's Venue, or holds an Admin assignment for the Organization. The system SHALL deny the operation when neither condition holds.

#### Scenario: Gerente denied access to an unassigned Venue
- **WHEN** a Gerente whose role assignment is scoped to Venue A attempts an operation on a resource belonging to Venue B in the same Organization
- **THEN** the system denies the operation

#### Scenario: Admin permitted across all venues
- **WHEN** an Admin attempts an operation on a resource belonging to any Venue in their Organization
- **THEN** the system allows the operation, subject to the operation's other permission requirements

### Requirement: Server-side enforcement of permissions
Permission checks for sensitive operations SHALL be enforced on the backend and SHALL NOT rely on the frontend to withhold access.

#### Scenario: Direct API call bypasses UI restriction
- **WHEN** a request is sent directly to the backend API for an operation the caller's role does not permit, bypassing any frontend UI restriction
- **THEN** the system denies the operation

### Requirement: Authorization checks validate identity, organization, permission, and ownership
Every operation on a tenant-owned entity SHALL validate: the caller's identity, the caller's Organization membership, the caller's permission for the operation, and resource ownership when applicable.

#### Scenario: Operation on an entity outside the caller's organization is denied
- **WHEN** a user attempts an operation on an entity that belongs to an Organization other than their own
- **THEN** the system denies the operation regardless of the user's role
