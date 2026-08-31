# communication/ticket-delivery Specification

## Purpose

Delivers an issued Ticket to its Customer by email, through a swappable provider so the sending mechanism can change without affecting issuance.

## Requirements

### Requirement: Ticket delivery is attempted on issuance
The system SHALL attempt to email an Order's issued Tickets to its Customer once all of that Order's Tickets have been issued.

#### Scenario: Delivery is attempted after issuance
- **WHEN** every Ticket for a paid Order has been issued
- **THEN** the system attempts to send them to the Order's Customer by email

### Requirement: Delivery outcome is recorded
The system SHALL record whether a delivery attempt succeeded, failed, or could not be attempted because no email provider is configured.

#### Scenario: Successful delivery is recorded
- **WHEN** a Ticket email is sent successfully
- **THEN** the system records that delivery succeeded for that Order's Customer

#### Scenario: Delivery without a configured provider is recorded, not crashed
- **WHEN** ticket delivery is attempted while no email provider is configured
- **THEN** the system records that delivery could not be attempted, and issuance of the Entitlement and Ticket is unaffected

### Requirement: Delivery failure does not affect issuance
A failed or unattempted email delivery SHALL NOT change the status of the Entitlement or Ticket it relates to, or prevent them from being issued.

#### Scenario: Email failure leaves the Ticket valid
- **WHEN** ticket delivery fails or cannot be attempted
- **THEN** the underlying Entitlement and Ticket remain issued and usable
