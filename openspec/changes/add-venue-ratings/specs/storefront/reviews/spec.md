## Purpose

Lets a genuine buyer rate their visit to a Venue, account-less and tied to a paid Order, and exposes the Venue's aggregate rating (average and count) publicly — without individual review text, a review list, or moderation, none of which the product currently needs.

## ADDED Requirements

### Requirement: Rating submission requires a paid order at the venue
The system SHALL allow an unauthenticated request carrying an Order id, its owning tenant id, and a star rating (1-5, integer) to submit a rating for that Order's Venue, only when the Order's status is `paid` or later (and not cancelled) and belongs to that Venue.

#### Scenario: Rating accepted for a paid order
- **WHEN** an unauthenticated request submits a 1-5 star rating with a paid Order's id and its owning tenant id
- **THEN** the system records the rating against that Order's Venue

#### Scenario: Rating rejected for an unpaid order
- **WHEN** a rating submission references an Order that has not reached `paid` status
- **THEN** the system rejects the submission and records no rating

#### Scenario: Rating rejected for a cancelled order
- **WHEN** a rating submission references a cancelled Order
- **THEN** the system rejects the submission and records no rating

#### Scenario: Rating rejected when order and tenant do not match
- **WHEN** a rating submission supplies an Order id together with a tenant id that is not the Order's owning tenant
- **THEN** the system rejects the submission as if the Order did not exist

#### Scenario: Star value out of range is rejected
- **WHEN** a rating submission supplies a star value outside 1-5
- **THEN** the system rejects the submission and records no rating

### Requirement: At most one rating per order
The system SHALL allow at most one rating to be recorded per Order, regardless of how many Tickets or line items that Order contains.

#### Scenario: Second submission for the same order is rejected
- **WHEN** a rating has already been recorded for an Order and a second rating submission references the same Order
- **THEN** the system rejects the second submission and the original rating is unchanged

### Requirement: Rating may include an optional comment, not publicly displayed
A rating submission SHALL be able to include an optional short text comment, stored alongside the star value, but the system SHALL NOT expose individual comments or star ratings on any public read — only the aggregate.

#### Scenario: Comment is stored but not exposed publicly
- **WHEN** a rating is submitted with a comment
- **THEN** the system stores the comment but no public read returns that comment or any other individual rating's value

### Requirement: Venue aggregate rating is public and account-less
The system SHALL allow an unauthenticated request to read a Venue's aggregate rating — the average star value (rounded to one decimal) and total count of ratings — identified by the venue's slug.

#### Scenario: Aggregate reflects all recorded ratings
- **WHEN** a Venue has recorded ratings of 5, 4, and 5 stars
- **THEN** an unauthenticated read of that Venue's aggregate rating returns an average of 4.7 and a count of 3

#### Scenario: Venue with no ratings has no aggregate to show
- **WHEN** a Venue has zero recorded ratings
- **THEN** the system reports no aggregate rating for that Venue, distinct from a zero average

### Requirement: Ratings are isolated by tenant
A rating SHALL be attributable only to the Venue and Organization it was submitted against, and reading one Organization's aggregate rating SHALL NOT expose another Organization's rating data.

#### Scenario: Aggregate read is isolated by tenant
- **WHEN** an unauthenticated request reads Organization A's Venue aggregate rating
- **THEN** the system returns only ratings recorded against that Venue, never another Organization's
