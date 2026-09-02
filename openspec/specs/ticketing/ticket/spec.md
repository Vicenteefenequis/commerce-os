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

### Requirement: Ticket code can be rendered as a QR image
The system SHALL provide a QR image representation of any Ticket's code, encoding only that code as the QR payload.

#### Scenario: QR image encodes the Ticket's code
- **WHEN** a Ticket's QR image is requested
- **THEN** the system returns an image whose payload decodes to exactly that Ticket's code, with no other data encoded

### Requirement: Tickets for a paid Order can be listed account-less
The system SHALL allow an unauthenticated request carrying an Order's id and its owning tenant id to list every Ticket issued for that Order's Entitlements, without requiring the requester to be an authenticated identity.

#### Scenario: Listing tickets for a paid order
- **WHEN** an unauthenticated request supplies a paid Order's id and its owning tenant id
- **THEN** the system returns every Ticket issued for that Order's Entitlements

#### Scenario: Listing is scoped by tenant and order id together
- **WHEN** a request supplies an Order id together with a tenant id that is not the Order's owning tenant
- **THEN** the system returns no Tickets, as if the Order did not exist

#### Scenario: Order not yet paid has no Tickets to list
- **WHEN** an unauthenticated request lists Tickets for an Order that has not transitioned to `paid`
- **THEN** the system returns an empty list, since no Ticket has been issued yet
