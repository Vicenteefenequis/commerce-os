## ADDED Requirements

### Requirement: Summary reports sales figures by channel
The dashboard summary SHALL additionally report GMV and order count broken out by Order channel (`storefront`/"platform" versus `counter`/"manual"), alongside the existing period totals.

#### Scenario: Summary splits GMV by channel
- **WHEN** the requested period contains GMV-counted Orders from both the `storefront` and `counter` channels
- **THEN** the summary reports GMV for each channel separately, in addition to the combined total

#### Scenario: Summary splits order and ticket counts by channel
- **WHEN** the requested period contains Orders from both the `storefront` and `counter` channels
- **THEN** the summary reports order and Ticket counts for each channel separately, in addition to the combined totals

#### Scenario: One channel has no activity in the period
- **WHEN** the requested period has no Orders from one of the two channels
- **THEN** that channel's reported GMV and counts are zero, and the other channel's figures are unaffected
