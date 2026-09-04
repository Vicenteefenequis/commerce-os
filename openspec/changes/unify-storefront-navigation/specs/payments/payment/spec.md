## ADDED Requirements

### Requirement: Payment page collects buyer identification before payment
The public payment page SHALL collect the consumer's name and email before the Order is created and a Payment is submitted to the Payment Provider.

#### Scenario: Buyer details are entered on the payment page
- **WHEN** a consumer reaches the payment page after submitting a cart
- **THEN** the page asks for the consumer's name and email before offering a payment method (Pix or card)

#### Scenario: Payment cannot proceed without buyer identification
- **WHEN** a consumer attempts to select a payment method without having entered their name and email
- **THEN** the system does not submit the payment
