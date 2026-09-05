## ADDED Requirements

### Requirement: Organization verification is platform-admin-controlled
The system SHALL provide a `verified` flag on Organization, defaulting to `false`, settable only by an authenticated platform admin (see `foundation/platform-admin`) and never by the Organization's own members.

#### Scenario: Platform admin verifies an organization
- **WHEN** an authenticated platform admin sets an Organization's `verified` flag to `true`
- **THEN** the system updates the flag and it is visible on that Organization's public discovery and storefront surfaces

#### Scenario: Organization member cannot self-verify
- **WHEN** a user authorized within an Organization (but not a platform admin) attempts to set that Organization's `verified` flag
- **THEN** the system denies the operation and the flag is unchanged

#### Scenario: New organization defaults to unverified
- **WHEN** a new Organization is created
- **THEN** its `verified` flag is `false` until a platform admin sets it
