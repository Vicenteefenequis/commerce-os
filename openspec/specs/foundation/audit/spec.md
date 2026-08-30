# foundation/audit Specification

## Purpose

Keeps a trustworthy, append-only record of sensitive operations so every administrative and financial action can be attributed and reconstructed later.

## Requirements

### Requirement: Sensitive operations are audited
The system SHALL record an audit entry for sensitive operations, including at minimum: permission changes, configuration changes, and administrative access.

#### Scenario: Configuration change is audited
- **WHEN** an Organization's configuration is changed
- **THEN** the system records an audit entry capturing the actor, the change, and the timestamp

#### Scenario: Permission change is audited
- **WHEN** a user's role or permissions are changed
- **THEN** the system records an audit entry capturing who made the change, what changed, and when

### Requirement: Audit entries have an identifiable actor
Every audit entry SHALL be attributable to a specific, identifiable actor.

#### Scenario: Audit entry without actor is rejected
- **WHEN** an attempt is made to record an audit entry without an identifiable acting user or system process
- **THEN** the system rejects the write; no anonymous audit entries are created

### Requirement: Audit trail is reliable under retries and failures
The audit trail SHALL NOT lose entries for sensitive operations due to process crashes, retries, or duplicate delivery of the underlying event.

#### Scenario: Audit consumer processes a duplicate event
- **WHEN** the same domain event is delivered to the audit consumer more than once (e.g. due to at-least-once delivery)
- **THEN** the system records exactly one audit entry for that event, not one per delivery

#### Scenario: Process crash after domain change but before audit write
- **WHEN** the process that performed a sensitive domain change crashes before the corresponding audit entry would have been written
- **THEN** the audit entry is still eventually recorded once the system recovers
