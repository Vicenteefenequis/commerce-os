## Purpose

Authenticates administrative users of the platform (owners, staff, operators) so that every subsequent request can be tied to a known, identifiable actor.

## ADDED Requirements

### Requirement: Administrative user authentication
The system SHALL authenticate administrative users via a server-side session referenced by an httpOnly cookie.

#### Scenario: Successful login
- **WHEN** a user submits valid credentials
- **THEN** the system creates a server-side session, issues an httpOnly session cookie to the client, and the user is considered authenticated on subsequent requests bearing that cookie

#### Scenario: Failed login
- **WHEN** a user submits invalid credentials
- **THEN** the system rejects the attempt and does not issue a session

### Requirement: Session-backed identity on every request
Every request to a protected resource SHALL resolve to a known identity via the session cookie, or be rejected.

#### Scenario: Request without valid session is rejected
- **WHEN** a request to a protected resource is made without a valid session cookie
- **THEN** the system rejects the request as unauthenticated

### Requirement: Session revocation
The system SHALL support immediate invalidation of an active session.

#### Scenario: Session invalidated after logout
- **WHEN** a user logs out, or an administrator revokes a user's session
- **THEN** subsequent requests using that session's cookie are treated as unauthenticated
