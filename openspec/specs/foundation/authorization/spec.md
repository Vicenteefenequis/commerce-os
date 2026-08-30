# foundation/authorization Specification

## Purpose

Determines what an authenticated identity is allowed to do within its Organization, enforced server-side on every sensitive operation.

## Requirements

### Requirement: Role-based access control
The system SHALL support the following roles: Owner, Admin, Finance, Sales, Operator, Access Operator, Read Only.

#### Scenario: User acts within their role's permissions
- **WHEN** a user with a given role attempts an operation permitted to that role
- **THEN** the system allows the operation

#### Scenario: User attempts an operation outside their role's permissions
- **WHEN** a user with a given role attempts an operation not permitted to that role
- **THEN** the system denies the operation

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
