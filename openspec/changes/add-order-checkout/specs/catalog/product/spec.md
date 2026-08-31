## ADDED Requirements

### Requirement: Variant capacity linkage
The system SHALL allow a Product variant to reference at most one Resource whose capacity it consumes when purchased. This reference, once set, is fixed for the life of the variant and does not vary by period.

#### Scenario: Variant with a resource consumes its capacity
- **WHEN** a variant that references a Resource is included in an Order line
- **THEN** the corresponding capacity is held for that Resource and period

#### Scenario: Variant without a resource holds no capacity
- **WHEN** a variant with no Resource reference is included in an Order line
- **THEN** no capacity is checked or held for that line
