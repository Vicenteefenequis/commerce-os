## ADDED Requirements

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
