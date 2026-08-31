# capacity/resource Specification

## Purpose

Represents something whose capacity must be managed — the physical or operational limit a Product consumes when sold (e.g. a venue's total daily capacity, a guided tour's group size).

## Requirements

### Requirement: Resource creation under a venue
The system SHALL allow an authorized actor to create a Resource that belongs to exactly one Venue.

#### Scenario: Successful resource creation
- **WHEN** an authorized actor submits resource details (name, at minimum) for an existing Venue
- **THEN** the system creates a new Resource associated with that Venue

#### Scenario: Resource cannot be created without a parent venue
- **WHEN** resource creation is attempted referencing a Venue that does not exist or does not belong to the acting tenant
- **THEN** the system rejects the operation and no Resource is created

### Requirement: Resource maximum capacity
A Resource SHALL be able to have a maximum capacity.

#### Scenario: Capacity is set on creation
- **WHEN** a Resource is created with a maximum capacity value
- **THEN** the system persists that value as the Resource's default capacity

### Requirement: Capacity varies by period
A Resource's capacity SHALL be able to be overridden for specific periods (e.g. a given date), distinct from its default maximum capacity.

#### Scenario: Period override takes precedence
- **WHEN** a Resource has a default capacity of 100 and a capacity override of 50 for a specific date
- **THEN** the system reports that date's capacity as 50 while all other dates use the default of 100

### Requirement: Available capacity calculation
The system SHALL calculate available capacity for a Resource on a given period as its configured capacity minus capacity already committed (held or consumed) for that period.

#### Scenario: Available capacity reflects commitments
- **WHEN** a Resource has a capacity of 100 for a date and 30 units are already committed for that date
- **THEN** the system reports 70 units as available for that date

#### Scenario: Available capacity never goes negative
- **WHEN** committed capacity for a period equals or exceeds configured capacity
- **THEN** the system reports available capacity as zero, never a negative number

### Requirement: Hard capacity overbooking prevention
When a Resource is configured for hard capacity enforcement, the system SHALL prevent commitments that would exceed the configured capacity for a period.

#### Scenario: Commitment exceeding hard capacity is rejected
- **WHEN** a commitment is attempted against a hard-capacity Resource for a period where available capacity is insufficient
- **THEN** the system rejects the commitment and does not reduce available capacity

#### Scenario: Concurrent commitments do not exceed hard capacity
- **WHEN** two commitments are attempted concurrently against a hard-capacity Resource and their combined size exceeds the remaining available capacity
- **THEN** the system accepts commitments only up to the remaining available capacity and rejects the rest, even under concurrent requests

### Requirement: Resource belongs to a single tenant
A Resource SHALL be readable and writable only by identities authorized within its owning Organization.

#### Scenario: Resource is isolated by tenant
- **WHEN** a user from Organization A attempts to read or modify a Resource belonging to a Venue of Organization B
- **THEN** the system denies the operation

### Requirement: Resource and capacity mutations are audited
Creation of a Resource and changes to its capacity (default or period override) SHALL be recorded in the audit log with the acting identity.

#### Scenario: Capacity override is audited
- **WHEN** an authorized actor sets a capacity override for a specific period
- **THEN** the system records an audit entry identifying the actor, the resource, the period, and the new capacity value

### Requirement: Commitment release frees capacity
The system SHALL allow a `held` commitment to be released, after which it no longer counts toward committed capacity for its Resource and period.

#### Scenario: Releasing a held commitment frees capacity
- **WHEN** a `held` commitment of 10 units is released
- **THEN** the system reports 10 additional units as available capacity for that Resource and period

#### Scenario: A consumed commitment cannot be released
- **WHEN** release is attempted on a commitment that is `consumed` or already `released`
- **THEN** the system rejects the operation and the commitment's status is unchanged

### Requirement: Commitment consumption is permanent
The system SHALL allow a `held` commitment to be marked consumed, after which it continues to count toward committed capacity for its Resource and period indefinitely.

#### Scenario: Consuming a held commitment keeps capacity committed
- **WHEN** a `held` commitment of 10 units is marked consumed
- **THEN** the system continues to report those 10 units as committed for that Resource and period, and the commitment cannot later be released

#### Scenario: An already-consumed or released commitment cannot be consumed again
- **WHEN** consumption is attempted on a commitment that is `consumed` or `released`
- **THEN** the system rejects the operation and the commitment's status is unchanged
