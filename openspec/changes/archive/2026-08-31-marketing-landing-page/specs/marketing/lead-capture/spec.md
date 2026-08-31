## Purpose

Persists interest submitted through the landing page CTA so the business can follow up with prospective pilot establishments, without requiring any of the transactional MVP capabilities to exist first.

## ADDED Requirements

### Requirement: Lead submission endpoint persists leads
The system SHALL provide an endpoint that accepts a lead submission containing establishment name, email, and business type, and persists it to a dedicated table.

#### Scenario: Valid submission is persisted
- **WHEN** a client submits a lead with establishment name, email, and business type
- **THEN** the system stores a new lead record with those fields and a submission timestamp

#### Scenario: Missing required field is rejected
- **WHEN** a client submits a lead missing establishment name, email, or business type
- **THEN** the system rejects the submission and does not create a lead record

#### Scenario: Malformed email is rejected
- **WHEN** a client submits a lead with a syntactically invalid email address
- **THEN** the system rejects the submission and does not create a lead record

### Requirement: Lead records are isolated from tenant data
Lead records SHALL NOT be associated with or scoped by any existing organization/tenant, since a lead is a prospective establishment, not yet an onboarded tenant.

#### Scenario: Lead submission does not require an organization context
- **WHEN** a client submits a lead
- **THEN** the system accepts the submission without any organization/tenant identifier
