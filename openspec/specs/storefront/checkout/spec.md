# storefront/checkout Specification

## Purpose

Gives a real, account-less consumer a public UI to go from browsing a tenant's storefront to a paid Order, closing the gap between `storefront/catalog`, the existing `commerce/checkout` API, and the existing public payment page.

## Requirements

### Requirement: Storefront checkout requires no account
The storefront UI SHALL let a consumer complete a purchase without creating an account or logging in at any step.

#### Scenario: Consumer completes a purchase without an account
- **WHEN** a consumer browses the storefront, selects a product and quantity, and enters their email and name
- **THEN** the UI completes the purchase flow through to the payment page without asking the consumer to create an account or log in

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

### Requirement: Storefront checkout hands off to the existing payment page
Once an Order is created and submitted for payment, the storefront UI SHALL redirect the consumer to the existing public payment page for that Order.

#### Scenario: Successful checkout redirects to payment
- **WHEN** a consumer's cart is successfully submitted
- **THEN** the UI creates the Order, submits it for payment, and redirects the consumer to the payment page for that Order

### Requirement: Storefront checkout surfaces checkout failures without losing the consumer's input
The storefront UI SHALL display a clear error when checkout fails (e.g. insufficient capacity, invalid buyer details) and SHALL preserve the consumer's cart and entered details so they can retry.

#### Scenario: Capacity failure is shown without discarding the cart
- **WHEN** a checkout submission fails because a selected variant lacks available capacity
- **THEN** the UI shows the failure reason and keeps the consumer's selected items and buyer details for a retry

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
