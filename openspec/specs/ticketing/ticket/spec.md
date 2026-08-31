# ticketing/ticket Specification

## Purpose

The usable manifestation of an Entitlement — a uniquely identifiable code that a QR presents at the door, referencing the right of entry without itself being the authorization rule.

## Requirements

### Requirement: Ticket is issued one per Entitlement
The system SHALL issue exactly one Ticket for each Entitlement, at the moment that Entitlement is issued.

#### Scenario: Entitlement issuance issues its Ticket
- **WHEN** an Entitlement is issued
- **THEN** the system issues exactly one Ticket referencing it

### Requirement: Ticket carries a unique code
Every Ticket SHALL carry a code that is unique across the system and suitable for encoding as a QR payload.

#### Scenario: Ticket codes do not collide
- **WHEN** two Tickets are issued, for the same or different tenants
- **THEN** their codes are distinct

### Requirement: Ticket code references the Entitlement, not an authorization decision
A Ticket's code SHALL identify only which Entitlement it manifests. The system SHALL NOT encode an access grant or validation result into the code itself.

#### Scenario: Ticket code alone does not imply validity
- **WHEN** a Ticket's code is decoded
- **THEN** it yields only a reference to its Entitlement, requiring a separate lookup to determine whether that Entitlement is still usable

### Requirement: Ticket belongs to a single tenant
A Ticket SHALL be readable only by identities authorized within its owning Organization.

#### Scenario: Ticket is isolated by tenant
- **WHEN** a user from Organization A attempts to read a Ticket belonging to Organization B
- **THEN** the system denies the operation
