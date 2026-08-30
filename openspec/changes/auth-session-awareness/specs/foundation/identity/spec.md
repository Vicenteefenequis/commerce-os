## ADDED Requirements

### Requirement: Session introspection
An authenticated caller SHALL be able to query its own resolved identity (tenant, user, roles) using its session cookie, and SHALL be rejected as unauthenticated if the session cookie is missing or invalid.

#### Scenario: Introspecting a valid session
- **WHEN** a request with a valid session cookie queries its own identity
- **THEN** the system returns that session's tenant, user, and roles

#### Scenario: Introspecting without a valid session
- **WHEN** a request without a valid session cookie queries its own identity
- **THEN** the system rejects the request as unauthenticated
