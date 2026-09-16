# foundation/user-management Specification

## Purpose

Lets an Admin view an Organization's users and manage their role assignments, including which Venue each Gerente, Vendedor, or Validador assignment is scoped to, without direct database access.

## Requirements

### Requirement: Only Admin can manage user role assignments
The system SHALL allow only an identity holding the Admin role to list an Organization's users and to create, update, or revoke a role assignment for any of them.

#### Scenario: Admin lists the organization's users
- **WHEN** an identity holding the Admin role requests the list of users for their Organization
- **THEN** the system returns every user belonging to that Organization along with their current role assignments

#### Scenario: Non-admin request is denied
- **WHEN** an identity holding the Gerente, Vendedor, or Validador role requests the list of users, or attempts to create, update, or revoke a role assignment
- **THEN** the system denies the request

#### Scenario: Admin creates a role assignment
- **WHEN** an identity holding the Admin role creates a valid role assignment for a user in their Organization
- **THEN** the system creates the assignment and it takes effect immediately

### Requirement: Role assignment specifies a role and, when required, a Venue
Creating a role assignment SHALL require a role (Admin, Gerente, Vendedor, or Validador) and, for Gerente, Vendedor, or Validador, exactly one Venue belonging to the same Organization. An Admin assignment SHALL NOT accept a Venue.

#### Scenario: Creating a non-Admin assignment without a Venue is rejected
- **WHEN** an Admin attempts to create a Gerente, Vendedor, or Validador assignment without specifying a Venue
- **THEN** the system rejects the request

#### Scenario: Creating an Admin assignment with a Venue is rejected
- **WHEN** an Admin attempts to create an Admin assignment that specifies a Venue
- **THEN** the system rejects the request

#### Scenario: Assigning a Venue from another Organization is rejected
- **WHEN** an Admin attempts to create a role assignment referencing a Venue that does not belong to the same Organization as the target user
- **THEN** the system rejects the request

### Requirement: A user can hold multiple role assignments
The system SHALL allow a user to hold more than one role assignment simultaneously, each independently created and revocable.

#### Scenario: User holds Vendedor and Validador for the same Venue
- **WHEN** an Admin assigns both the Vendedor role and the Validador role, each scoped to the same Venue, to the same user
- **THEN** the system grants that user both roles for that Venue

#### Scenario: Revoking one assignment leaves others intact
- **WHEN** a user holds more than one role assignment and one of them is revoked
- **THEN** the remaining assignment(s) continue to grant their permissions unaffected

### Requirement: Admin creates a new user together with their first role assignment
The system SHALL allow an identity holding the Admin role to create a new user - with an email and an Admin-supplied initial password - and their first role assignment (role, and Venue when required) in a single action. The new user's email SHALL be unique within the Organization. This does not replace assigning an additional role to an already-existing user (a separate action).

#### Scenario: Admin creates a user with a Venue-scoped role
- **WHEN** an identity holding the Admin role submits an email, a password, and a Gerente/Vendedor/Validador role with a Venue belonging to the same Organization
- **THEN** the system creates a new user in that Organization with the given email and password, and a role assignment for that role and Venue

#### Scenario: Admin creates a user with the Admin role
- **WHEN** an identity holding the Admin role submits an email, a password, and the Admin role
- **THEN** the system creates a new user in that Organization with an org-wide Admin assignment (no Venue)

#### Scenario: Duplicate email within the same Organization is rejected
- **WHEN** an Admin submits an email that already belongs to a user in the same Organization
- **THEN** the system rejects the request and creates neither a user nor a role assignment

#### Scenario: Same email is allowed across different Organizations
- **WHEN** two different Organizations each create a user with the same email
- **THEN** both users are created successfully, since email uniqueness is scoped to the owning Organization

### Requirement: Revoking a role assignment takes effect immediately
Revoking a role assignment SHALL immediately deny any operation that assignment previously permitted, without requiring the affected user to log out or their session to expire.

#### Scenario: Revoked assignment is denied on the next request
- **WHEN** an Admin revokes a user's role assignment while that user has an active session
- **THEN** the user's next request relying on that assignment's permissions is denied
