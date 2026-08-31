# catalog/product Specification

## Purpose

Represents what a Venue sells: a Product that a customer can purchase, with variants, a price, an availability window, and channel visibility rules.

## Requirements

### Requirement: Product creation under a venue
The system SHALL allow an authorized actor to create a Product that belongs to exactly one Venue.

#### Scenario: Successful product creation
- **WHEN** an authorized actor submits product details (name and at least one price, at minimum) for an existing Venue
- **THEN** the system creates a new Product associated with that Venue

#### Scenario: Product cannot be created without a parent venue
- **WHEN** product creation is attempted referencing a Venue that does not exist or does not belong to the acting tenant
- **THEN** the system rejects the operation and no Product is created

### Requirement: Product variants
A Product SHALL be able to have one or more variants (e.g. adult ticket, child ticket).

#### Scenario: Product with multiple variants
- **WHEN** a Product is created or updated with two or more variants, each with its own name and price
- **THEN** the system persists all variants under that Product and each can be referenced independently

### Requirement: Product pricing
Each Product variant SHALL have a price expressed in the Organization's currency.

#### Scenario: Price is required
- **WHEN** a variant is submitted without a price
- **THEN** the system rejects the operation

#### Scenario: Price change does not affect past orders
- **WHEN** a Product variant's price is updated
- **THEN** orders already placed at the previous price are unaffected (their price snapshot is unchanged)

### Requirement: Product availability window
A Product SHALL be able to define a period during which it can be purchased (start date, end date, or both).

#### Scenario: Product outside its availability window cannot be purchased
- **WHEN** a request to purchase a Product is made outside its configured availability window
- **THEN** the system rejects the purchase

#### Scenario: Product without a configured window is always available
- **WHEN** a Product has no availability window configured
- **THEN** the system treats it as available at any time, subject to other constraints (e.g. capacity)

### Requirement: Product channel visibility
A Product SHALL be able to restrict which sales channels it is visible or purchasable through.

#### Scenario: Product hidden from a channel
- **WHEN** a Product is configured as not visible on a given channel
- **THEN** requests for that Product through that channel do not return it and cannot purchase it

### Requirement: Product belongs to a single tenant
A Product SHALL be readable and writable only by identities authorized within its owning Organization.

#### Scenario: Product is isolated by tenant
- **WHEN** a user from Organization A attempts to read or modify a Product belonging to a Venue of Organization B
- **THEN** the system denies the operation

### Requirement: Product mutations are audited
Creation and modification of a Product or its variants, price, availability window, or channel rules SHALL be recorded in the audit log with the acting identity.

#### Scenario: Price change is audited
- **WHEN** an authorized actor changes a Product variant's price
- **THEN** the system records an audit entry identifying the actor, the product, the previous price, and the new price

### Requirement: Variant capacity linkage
The system SHALL allow a Product variant to reference at most one Resource whose capacity it consumes when purchased. This reference, once set, is fixed for the life of the variant and does not vary by period.

#### Scenario: Variant with a resource consumes its capacity
- **WHEN** a variant that references a Resource is included in an Order line
- **THEN** the corresponding capacity is held for that Resource and period

#### Scenario: Variant without a resource holds no capacity
- **WHEN** a variant with no Resource reference is included in an Order line
- **THEN** no capacity is checked or held for that line
