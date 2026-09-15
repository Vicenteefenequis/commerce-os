## ADDED Requirements

### Requirement: Order records its sales channel
An Order SHALL record which channel created it: `storefront` (created through `commerce/checkout`) or `counter` (created through `admin/counter-sale`).

#### Scenario: Storefront checkout sets the storefront channel
- **WHEN** an Order is created through `commerce/checkout`
- **THEN** that Order's channel is `storefront`

#### Scenario: Counter sale sets the counter channel
- **WHEN** an Order is created through `admin/counter-sale`
- **THEN** that Order's channel is `counter`

### Requirement: Orders can be filtered by sales channel
The system SHALL allow an authorized actor to filter the list of an Organization's Orders by channel, alongside its existing filters (order id, customer email or name, status).

#### Scenario: Filtering by channel
- **WHEN** an authorized actor requests the list of Orders with a channel filter
- **THEN** the system returns only Orders matching that channel

#### Scenario: Combining a channel filter with other filters
- **WHEN** an authorized actor requests the list of Orders with a channel filter and one or more of the existing filters
- **THEN** the system returns only Orders matching all of the supplied filters
