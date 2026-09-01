## ADDED Requirements

### Requirement: A concrete email provider can be configured
The system SHALL support configuring a real email provider so ticket-delivery emails actually send, while continuing to record delivery as `not_configured` (per "Delivery without a configured provider is recorded, not crashed") when no provider is configured.

#### Scenario: Configured provider sends the email
- **WHEN** a real email provider is configured and ticket delivery is attempted
- **THEN** the system sends the email through that provider and records the outcome as sent or failed based on the provider's response

#### Scenario: Unconfigured deployment keeps today's behavior
- **WHEN** no real email provider is configured
- **THEN** ticket delivery is recorded as `not_configured`, exactly as before this capability existed
