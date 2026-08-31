# customer/customer Specification

## Purpose

Represents the buyer of an Order as a minimal, tenant-scoped identity — enough to know who a purchase belongs to and where to deliver what it grants, without requiring an account.

## Requirements

### Requirement: Customer identity is captured without an account
The system SHALL capture a buyer's email and name at checkout and resolve them to a Customer record, without requiring the buyer to authenticate or register.

#### Scenario: Guest checkout captures customer identity
- **WHEN** a checkout is submitted with a buyer email and name
- **THEN** the system resolves or creates a Customer record for that email within the tenant

### Requirement: Customer is reused by email within a tenant
The system SHALL reuse an existing Customer record for a repeat buyer identified by the same email within the same tenant, rather than creating a duplicate.

#### Scenario: Repeat buyer reuses their Customer record
- **WHEN** a checkout is submitted with an email that already matches a Customer in the tenant
- **THEN** the system reuses that Customer record instead of creating a new one

#### Scenario: Same email in different tenants are distinct Customers
- **WHEN** the same email is used for checkouts in two different tenants
- **THEN** the system creates or resolves a separate Customer record per tenant

### Requirement: Customer belongs to a single tenant
A Customer SHALL be readable only by identities authorized within its owning Organization.

#### Scenario: Customer is isolated by tenant
- **WHEN** a user from Organization A attempts to read a Customer belonging to Organization B
- **THEN** the system denies the operation
