# capacity/reservation Specification

## Purpose

Represents the retention or planned consumption of a Resource's capacity by a specific request (e.g. a checkout in progress), with an explicit lifecycle from initial hold through confirmation, expiry, cancellation, or final consumption at the point of use.

## Requirements

### Requirement: Reservation creation holds capacity
The system SHALL allow an authorized actor to create a Reservation for a Resource and period, which holds the requested amount of capacity.

#### Scenario: Successful reservation holds capacity
- **WHEN** an authorized actor creates a Reservation for an amount that fits within available capacity
- **THEN** the system creates the Reservation in `pending` status and the held amount is no longer reported as available capacity for that Resource and period

#### Scenario: Reservation creation fails when capacity is unavailable
- **WHEN** an authorized actor attempts to create a Reservation for an amount exceeding available capacity on a hard-capacity Resource
- **THEN** the system rejects the Reservation, creates no record, and available capacity is unchanged

### Requirement: Reservation lifecycle states
A Reservation SHALL have an explicit status of one of: `pending`, `confirmed`, `expired`, `cancelled`, `consumed`.

#### Scenario: New reservation starts pending
- **WHEN** a Reservation is created
- **THEN** its status is `pending`

### Requirement: Reservation confirmation
The system SHALL allow a `pending` Reservation to be confirmed, without changing the amount of capacity it holds.

#### Scenario: Confirming a pending reservation
- **WHEN** a `pending` Reservation is confirmed
- **THEN** its status becomes `confirmed` and its held capacity remains committed

#### Scenario: Confirming a non-pending reservation is rejected
- **WHEN** confirmation is attempted on a Reservation that is not `pending`
- **THEN** the system rejects the operation and the Reservation's status is unchanged

### Requirement: Reservation expiry releases capacity
The system SHALL allow a `pending` Reservation to expire, releasing its held capacity back to available.

#### Scenario: Expiring a pending reservation frees capacity
- **WHEN** a `pending` Reservation expires before being confirmed
- **THEN** its status becomes `expired` and the amount it held is again reported as available capacity for that Resource and period

#### Scenario: Confirmed reservations do not expire
- **WHEN** expiry is attempted on a Reservation that is `confirmed`, `cancelled`, or `consumed`
- **THEN** the system rejects the operation and the Reservation's status is unchanged

### Requirement: Reservation cancellation releases capacity
The system SHALL allow a `pending` or `confirmed` Reservation to be cancelled, releasing its held capacity back to available.

#### Scenario: Cancelling a confirmed reservation frees capacity
- **WHEN** a `confirmed` Reservation is cancelled
- **THEN** its status becomes `cancelled` and the amount it held is again reported as available capacity for that Resource and period

#### Scenario: Consumed reservations cannot be cancelled
- **WHEN** cancellation is attempted on a Reservation that is `consumed`, `expired`, or already `cancelled`
- **THEN** the system rejects the operation and the Reservation's status is unchanged

### Requirement: Reservation consumption is terminal
The system SHALL allow a `confirmed` Reservation to be consumed, permanently retaining its held capacity as used rather than releasing it.

#### Scenario: Consuming a confirmed reservation
- **WHEN** a `confirmed` Reservation is consumed
- **THEN** its status becomes `consumed` and the amount it held continues to be excluded from available capacity for that Resource and period

#### Scenario: A reservation can only be consumed once
- **WHEN** consumption is attempted on a Reservation that is already `consumed`, or is `pending`, `expired`, or `cancelled`
- **THEN** the system rejects the operation and the Reservation's status is unchanged

### Requirement: Reservation belongs to a single tenant
A Reservation SHALL be readable and writable only by identities authorized within its owning Organization.

#### Scenario: Reservation is isolated by tenant
- **WHEN** a user from Organization A attempts to read or modify a Reservation belonging to a Resource of Organization B
- **THEN** the system denies the operation

### Requirement: Reservation state transitions are audited
Every Reservation status transition SHALL be recorded in the audit log with the acting identity.

#### Scenario: Cancellation is audited
- **WHEN** an authorized actor cancels a Reservation
- **THEN** the system records an audit entry identifying the actor, the Reservation, and the resulting status
