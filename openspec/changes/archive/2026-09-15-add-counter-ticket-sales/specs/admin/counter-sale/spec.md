## Purpose

Lets an authenticated staff member create a paid Order directly from the admin dashboard for a walk-in visitor who did not purchase through the storefront, reusing the same capacity, Entitlement, and Ticket issuance as any other Order.

## ADDED Requirements

### Requirement: Counter sale requires an authenticated admin session
The system SHALL allow any authenticated admin session for an Organization to create a counter sale for that Organization, with no additional permission beyond the existing session-based authorization admin screens already require.

#### Scenario: Unauthenticated request cannot create a counter sale
- **WHEN** a request without a valid admin session attempts to create a counter sale
- **THEN** the system denies the operation

#### Scenario: Any authenticated admin session can create a counter sale
- **WHEN** an authenticated admin session for an Organization submits a valid counter sale
- **THEN** the system creates it, without checking for a role or permission beyond that session

### Requirement: Counter sale buyer identity is optional
The system SHALL allow a counter sale to be submitted without a buyer name or email, resolving it to a single shared placeholder Customer per Organization instead of rejecting the request.

#### Scenario: Counter sale with buyer identity
- **WHEN** a counter sale is submitted with a buyer name and email
- **THEN** the system resolves or creates that Customer and creates the Order referencing them, the same way storefront checkout does

#### Scenario: Counter sale without buyer identity
- **WHEN** a counter sale is submitted with no buyer name or email
- **THEN** the system creates the Order referencing the Organization's shared placeholder "Cliente balcão" Customer, rather than rejecting the request

#### Scenario: Placeholder customer is reused across counter sales
- **WHEN** two counter sales without buyer identity are created for the same Organization
- **THEN** both Orders reference the same placeholder Customer for that Organization, not two separate placeholder records

### Requirement: Counter sale recalculates price server-side
The system SHALL recalculate every price and total for a counter sale from current Product/variant data, the same guarantee `commerce/checkout` provides for storefront orders.

#### Scenario: Server ignores a submitted price
- **WHEN** a counter sale request includes a price for a line that differs from the variant's current price
- **THEN** the system uses its own recalculated price and ignores the submitted value

### Requirement: Counter sale respects capacity
A counter sale line for a variant that references a Resource SHALL be subject to the same capacity check and Reservation hold as an Order line created through `commerce/checkout`.

#### Scenario: Counter sale rejected for insufficient capacity
- **WHEN** a counter sale is submitted with a line whose quantity exceeds available capacity for its Resource and period
- **THEN** the system rejects the entire counter sale and creates no Order, Reservation, or Payment

#### Scenario: Counter sale holds capacity like any other order
- **WHEN** a counter sale is submitted with a line whose quantity fits within available capacity for its Resource and period
- **THEN** the system creates a Reservation holding that capacity, the same as an equivalent storefront Order line would

### Requirement: Counter sale completes as a paid Order immediately
The system SHALL create a counter sale's Order already `paid`, backed by a `cash` Payment created `succeeded`, in a single staff-facing action rather than a multi-step draft/awaiting-payment flow.

#### Scenario: Successful counter sale is immediately paid
- **WHEN** an authorized admin session submits a valid counter sale
- **THEN** the system creates the Order as `paid`, creates a `cash` Payment for it as `succeeded`, and issues its Entitlements and Tickets

### Requirement: Counter sale records its Order's channel as counter
Every Order created through a counter sale SHALL have its channel recorded as `counter`, distinguishing it from an Order created through storefront checkout.

#### Scenario: Counter sale sets the counter channel
- **WHEN** a counter sale creates an Order
- **THEN** that Order's channel is `counter`
