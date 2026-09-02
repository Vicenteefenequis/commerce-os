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
