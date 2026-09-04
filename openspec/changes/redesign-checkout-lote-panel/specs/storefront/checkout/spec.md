## ADDED Requirements

### Requirement: Offer-scoped cart selection skips the shared visit-date field
When the consumer has selected a dated offer (a Product with a fixed availability window, per `storefront/showcase`'s Ofertas tab), the cart step SHALL scope quantity selection to that offer's variants (lotes) alone and SHALL NOT show the shared visit-date field, since the offer's own availability window determines the date.

#### Scenario: Selecting a dated offer hides the visit-date field
- **WHEN** a consumer selects an offer with a fixed availability window
- **THEN** the cart panel shows that offer's lotes and quantity controls without a separate visit-date field

#### Scenario: Venue without dated offers keeps the shared visit-date flow
- **WHEN** a venue's storefront-visible products are not organized as dated offers
- **THEN** the cart step shows the existing shared visit-date field and flat variant list unchanged

### Requirement: Offer panel shows a lote picker with capacity and price
The offer-scoped cart panel SHALL display each of the selected offer's variants as a lote choice, showing its name, remaining capacity (when resource-backed), and price, with single-selection (one lote at a time).

#### Scenario: Lote choices show remaining capacity and price
- **WHEN** an offer has two resource-backed variants
- **THEN** the panel shows both as selectable lote rows, each with its own remaining capacity and price

#### Scenario: Selecting a lote updates the panel's price breakdown
- **WHEN** a consumer selects a different lote in the panel
- **THEN** the price breakdown recalculates using that lote's price and the current quantity

### Requirement: Offer panel price breakdown reflects only server-chargeable amounts
The offer-scoped cart panel SHALL show a price breakdown of subtotal (selected lote's price × quantity) and total, and SHALL NOT display a fee or charge line that the checkout submission does not actually collect.

#### Scenario: Breakdown shows subtotal equal to total when no fee exists
- **WHEN** the offer-scoped panel computes its price breakdown
- **THEN** the displayed total equals the subtotal, since no fee is charged by checkout submission

### Requirement: Offer panel renders as a fixed side panel on desktop and a bottom sheet on mobile
The offer-scoped cart panel SHALL render as a panel fixed alongside the offer list on desktop breakpoints, and as a bottom sheet opened from a sticky mini-bar (showing price-from and the primary call to action) on mobile breakpoints, using the same underlying component and behavior on both.

#### Scenario: Desktop shows the panel fixed beside the offer list
- **WHEN** the offer-scoped cart panel is shown on a desktop breakpoint
- **THEN** it renders fixed to the side of the offer list, remaining visible while the offer list scrolls

#### Scenario: Mobile shows a sticky mini-bar that opens the panel as a bottom sheet
- **WHEN** the offer-scoped cart panel is shown on a mobile breakpoint
- **THEN** a sticky mini-bar with price-from and the primary call to action is shown, and activating it opens the same panel content in a bottom sheet

## MODIFIED Requirements

### Requirement: Storefront cart prevents selecting more than the available capacity
The storefront UI SHALL disable quantity selection for a capacity-bound variant (including a lote within an offer-scoped panel) that has zero remaining capacity for its period, and SHALL NOT allow its quantity input to be raised above the remaining capacity, regardless of whether it is presented in the shared-date flat list or an offer-scoped panel.

#### Scenario: Sold-out variant is disabled
- **WHEN** a capacity-bound variant has zero remaining capacity for its period
- **THEN** the UI marks that variant as sold out and disables its quantity input, whether shown in the flat list or as a lote in an offer panel

#### Scenario: Quantity input is capped at remaining capacity
- **WHEN** a consumer tries to set a capacity-bound variant's quantity above its remaining capacity
- **THEN** the UI does not accept a quantity higher than the remaining capacity, in either presentation

#### Scenario: Existing selection exceeds capacity after a date change
- **WHEN** a consumer has already selected a quantity for a capacity-bound variant in the shared-date flat list and then changes the visit date to one where the remaining capacity is lower than the selected quantity
- **THEN** the UI flags that line so the consumer can see and correct it before submitting
