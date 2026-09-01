## ADDED Requirements

### Requirement: A configured provider sends the email
When an email provider is configured, the system SHALL use it to actually send the Ticket email, rather than only recording `not_configured`.

#### Scenario: Configured provider sends the ticket email
- **WHEN** ticket delivery is attempted and an email provider is configured
- **THEN** the system sends the email through that provider and records the resulting outcome (`sent` or `failed`) instead of `not_configured`

### Requirement: Provider send failures are recorded, not thrown
An error raised by the configured email provider while sending SHALL be recorded as a failed delivery and SHALL NOT propagate out of the delivery attempt.

#### Scenario: Provider error is recorded as failed
- **WHEN** the configured email provider raises an error or returns a non-success response while sending
- **THEN** the system records that delivery failed for that Order's Customer
- **AND** the error does not affect issuance of the Entitlement or Ticket, or any other part of the request

### Requirement: A production-capable provider takes priority over a development-only one
When more than one email provider is configured at once, the system SHALL use the production-capable provider and SHALL NOT fall back to a development-only provider.

#### Scenario: Both a production and a development provider are configured
- **WHEN** ticket delivery is attempted and both a production-capable provider and a development-only provider are configured
- **THEN** the system sends through the production-capable provider
