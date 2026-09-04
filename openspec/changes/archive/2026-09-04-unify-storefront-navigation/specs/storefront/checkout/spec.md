## MODIFIED Requirements

### Requirement: Storefront checkout requires no account
The storefront UI SHALL let a consumer complete a purchase without creating an account or logging in at any step. The cart step (`/loja/[tenantSlug]/[venueSlug]`) SHALL NOT require the consumer's name or email; those are collected on the payment page (`payments/payment`) instead.

#### Scenario: Consumer completes a purchase without an account
- **WHEN** a consumer browses the storefront, selects a product and quantity, submits the cart, and then enters their email and name on the payment page
- **THEN** the UI completes the purchase flow through to payment confirmation without asking the consumer to create an account or log in

#### Scenario: Cart step does not ask for buyer details
- **WHEN** a consumer is on the cart step selecting products and quantities
- **THEN** the UI does not show a name or email field on that step

### Requirement: Storefront checkout shows a clear order summary before payment
The storefront UI SHALL display the selected items, quantity, and running total price in a footer bar fixed to the bottom of the viewport, updating live as the consumer changes quantities, throughout the cart step. The UI SHALL collect a single visit date for the entire cart, displayed above the ticket/product list, before the consumer selects ticket quantities, except when the smart-default rule below applies; this one date SHALL be applied to every capacity-bound line item (a variant tied to a bookable resource) in the cart. Variants not tied to a bookable resource SHALL NOT require a date.

#### Scenario: Order summary precedes payment
- **WHEN** a consumer has selected products and quantities on the cart step
- **THEN** the UI shows the items, quantities, and running total price in the fixed footer bar before the cart is submitted

#### Scenario: Fixed footer shows a live-updating total
- **WHEN** a consumer changes a ticket variant's quantity on the cart step
- **THEN** the fixed footer bar's total updates immediately to reflect the new quantity, without the consumer scrolling to a separate summary section

#### Scenario: Visit date is chosen before ticket quantities
- **WHEN** a consumer opens the storefront cart for a venue with more than one ticket type or a variant available on a date other than today
- **THEN** a single visit-date field, defaulted to today, is shown above the ticket/product list, before any per-ticket quantity input

#### Scenario: One visit date applies to every capacity-bound line
- **WHEN** a consumer sets the cart's visit date and then adds quantities for two different capacity-bound ticket variants
- **THEN** both variants are checked out for the same visit date, with no separate date field per variant

#### Scenario: Changing the visit date preserves selected quantities
- **WHEN** a consumer has already set ticket quantities and then changes the cart's visit date
- **THEN** the previously selected quantities remain unchanged

### Requirement: Storefront checkout hands off to the existing payment page
Once the cart is submitted, the storefront UI SHALL redirect the consumer to the payment page, where the consumer supplies their name and email before the Order is created and submitted for payment.

#### Scenario: Successful checkout redirects to payment
- **WHEN** a consumer's cart is successfully submitted
- **THEN** the UI redirects the consumer to the payment page, carrying the selected items, quantities, and visit date

### Requirement: Storefront checkout surfaces checkout failures without losing the consumer's input
The storefront UI SHALL display a clear error when checkout fails (e.g. insufficient capacity) and SHALL preserve the consumer's cart selections so they can retry.

#### Scenario: Capacity failure is shown without discarding the cart
- **WHEN** a checkout submission fails because a selected variant lacks available capacity
- **THEN** the UI shows the failure reason and keeps the consumer's selected items for a retry

## ADDED Requirements

### Requirement: Cart step displays the venue's profile
The cart step (`/loja/[tenantSlug]/[venueSlug]`) SHALL display the venue's profile (`storefront/showcase`) — name, category, city, address, description, and cover photo when set — above the ticket-selection UI, on the same screen, rather than requiring navigation to a separate page.

#### Scenario: Venue profile and ticket selection appear on one screen
- **WHEN** an unauthenticated consumer opens a venue's cart step
- **THEN** the page shows the venue's profile and the ticket-selection UI together, with no navigation required between them

### Requirement: Single-option cart defaults quantity and skips date selection
When a venue offers exactly one ticket variant and that variant is not tied to a bookable Resource requiring a future-date selection (i.e., it is always available "today"), the cart step SHALL default that variant's quantity to 1 and SHALL NOT show the visit-date field, while still allowing the consumer to change the quantity before submitting.

#### Scenario: Single always-available variant skips the date step
- **WHEN** a consumer opens the cart step for a venue with exactly one ticket variant that is not tied to a bookable Resource
- **THEN** the page shows that variant pre-selected with quantity 1 and no visit-date field, with the fixed footer total already reflecting one unit

#### Scenario: Consumer can still change the defaulted quantity
- **WHEN** a consumer is on a single-option cart with the smart default applied
- **THEN** the consumer can increase or decrease the quantity, and the fixed footer total updates accordingly
