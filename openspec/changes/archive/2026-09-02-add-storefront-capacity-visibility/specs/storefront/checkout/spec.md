## ADDED Requirements

### Requirement: Storefront cart shows remaining capacity for the selected date
The storefront UI SHALL look up and display remaining capacity for every capacity-bound variant (a variant tied to a bookable Resource) for the cart's selected visit date, using the existing storefront availability lookup, and SHALL refresh that figure whenever the visit date changes.

#### Scenario: Remaining capacity is shown next to a capacity-bound variant
- **WHEN** a consumer opens the storefront cart with a visit date selected
- **THEN** each capacity-bound variant shows its remaining capacity for that date

#### Scenario: Remaining capacity refreshes when the visit date changes
- **WHEN** a consumer changes the cart's visit date
- **THEN** the displayed remaining capacity for every capacity-bound variant updates to reflect the new date

#### Scenario: Variant without a resource shows no capacity figure
- **WHEN** a variant is not tied to a bookable Resource
- **THEN** the UI shows no remaining-capacity figure and applies no quantity limit for that variant

### Requirement: Storefront cart prevents selecting more than the available capacity
The storefront UI SHALL disable quantity selection for a capacity-bound variant that has zero remaining capacity for the selected date, and SHALL NOT allow its quantity input to be raised above the remaining capacity.

#### Scenario: Sold-out variant is disabled
- **WHEN** a capacity-bound variant has zero remaining capacity for the selected visit date
- **THEN** the UI marks that variant as sold out and disables its quantity input

#### Scenario: Quantity input is capped at remaining capacity
- **WHEN** a consumer tries to set a capacity-bound variant's quantity above its remaining capacity for the selected date
- **THEN** the UI does not accept a quantity higher than the remaining capacity

#### Scenario: Existing selection exceeds capacity after a date change
- **WHEN** a consumer has already selected a quantity for a capacity-bound variant and then changes the visit date to one where the remaining capacity is lower than the selected quantity
- **THEN** the UI flags that line so the consumer can see and correct it before submitting
