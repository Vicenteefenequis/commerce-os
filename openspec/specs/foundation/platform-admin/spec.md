# foundation/platform-admin Specification

## Purpose

Represents the platform owner's identity: an actor that is not scoped to any single Organization, able to authenticate independently of any tenant and to see and register every Organization on the platform.

## Requirements

### Requirement: Platform admin authentication
The system SHALL allow a platform admin to authenticate with email and password, independent of any Organization (tenant), and SHALL issue a session distinct from any tenant user's session.

#### Scenario: Successful platform login
- **WHEN** a platform admin submits a valid email and password to the platform login
- **THEN** the system establishes a platform session and returns credentials for it (e.g. a session cookie), without requiring or accepting a tenant identifier

#### Scenario: Invalid credentials rejected
- **WHEN** a platform login is submitted with an email/password combination that does not match a platform admin
- **THEN** the system rejects the request and does not establish a session

#### Scenario: Platform session is independent of tenant session
- **WHEN** a person holds both a valid tenant admin session (for some Organization) and a valid platform session
- **THEN** both sessions remain valid and distinguishable; using one does not consume, invalidate, or get confused with the other

### Requirement: Platform-only access to tenant management
Every operation that lists or registers Organizations on the platform SHALL require a valid, non-expired, non-revoked platform session; requests without one SHALL be rejected.

#### Scenario: Unauthenticated tenant listing rejected
- **WHEN** a request to list Organizations is made without a valid platform session
- **THEN** the system rejects the request and returns no Organization data

#### Scenario: Unauthenticated tenant creation rejected
- **WHEN** a request to create an Organization is made without a valid platform session
- **THEN** the system rejects the request and no Organization is created

#### Scenario: Expired or revoked platform session rejected
- **WHEN** a request is made using a platform session that has expired or been revoked
- **THEN** the system treats the request as unauthenticated and rejects it

### Requirement: List all tenants
A platform admin SHALL be able to retrieve the list of every Organization registered on the platform, regardless of how many Organizations exist or which one the admin last interacted with.

#### Scenario: Listing returns every organization
- **WHEN** an authenticated platform admin requests the list of Organizations
- **THEN** the system returns every Organization registered on the platform, including its name and slug

### Requirement: Register a tenant as platform admin
A platform admin SHALL be able to register a new Organization by choosing its name and slug together with an email and password for that Organization's first administrative user, subject to the same validation and uniqueness rules as Organization creation. The system SHALL create the Organization, the first user, and that user's `owner` role assignment as a single atomic operation.

#### Scenario: Platform admin creates a tenant with its first owner
- **WHEN** an authenticated platform admin submits a name and slug for a new Organization together with an email and password for its first user
- **THEN** the system creates the Organization using that name and slug, creates a user under that Organization with the given email and password, assigns that user the `owner` role, and that user can subsequently authenticate against that Organization

#### Scenario: Duplicate slug rejected
- **WHEN** an authenticated platform admin submits a slug that already belongs to another Organization
- **THEN** the system rejects the operation and no Organization is created

#### Scenario: Creation fails atomically if the first user cannot be created
- **WHEN** an authenticated platform admin submits tenant and owner details but creating the first user fails (e.g. an invalid email)
- **THEN** the system rejects the entire operation and no Organization, user, or role assignment is created
