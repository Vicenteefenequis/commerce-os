## ADDED Requirements

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
