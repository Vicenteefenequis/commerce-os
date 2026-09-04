## ADDED Requirements

### Requirement: Sold-out offer shows a waitlist join affordance
The Ofertas tab SHALL show a waitlist join affordance (per `storefront/waitlist`) on an offer that currently has zero remaining capacity, instead of only a disabled or grayed-out row.

#### Scenario: Sold-out offer shows the waitlist affordance
- **WHEN** an offer in the Ofertas tab has zero remaining capacity
- **THEN** its row shows a waitlist join affordance in addition to its sold-out state

#### Scenario: Offer with remaining capacity shows no waitlist affordance
- **WHEN** an offer in the Ofertas tab has remaining capacity greater than zero
- **THEN** its row shows no waitlist join affordance
