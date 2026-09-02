## MODIFIED Requirements

### Requirement: Storefront checkout shows a clear order summary before payment
The storefront UI SHALL display the selected items, quantity, and total price to the consumer before they are sent to payment. The UI SHALL collect a single visit date for the entire cart, displayed above the ticket/product list, before the consumer selects ticket quantities; this one date SHALL be applied to every capacity-bound line item (a variant tied to a bookable resource) in the cart. Variants not tied to a bookable resource SHALL NOT require a date.

#### Scenario: Order summary precedes payment
- **WHEN** a consumer has selected products and entered their buyer details
- **THEN** the UI shows the items, quantities, and total price before redirecting to payment

#### Scenario: Visit date is chosen before ticket quantities
- **WHEN** a consumer opens the storefront cart
- **THEN** a single visit-date field, defaulted to today, is shown above the ticket/product list, before any per-ticket quantity input

#### Scenario: One visit date applies to every capacity-bound line
- **WHEN** a consumer sets the cart's visit date and then adds quantities for two different capacity-bound ticket variants
- **THEN** both variants are checked out for the same visit date, with no separate date field per variant

#### Scenario: Changing the visit date preserves selected quantities
- **WHEN** a consumer has already set ticket quantities and then changes the cart's visit date
- **THEN** the previously selected quantities remain unchanged
