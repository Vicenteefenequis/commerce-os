## ADDED Requirements

### Requirement: Avaliações tab shows the venue's aggregate rating
The storefront purchase page's tab set SHALL include an Avaliações tab showing the Venue's aggregate rating (average and count) per `storefront/reviews`, shown only when at least one rating exists for that Venue.

#### Scenario: Avaliações tab shows the aggregate when ratings exist
- **WHEN** a consumer selects the Avaliações tab for a Venue with at least one recorded rating
- **THEN** the tab shows that Venue's average rating and total count

#### Scenario: Avaliações tab is omitted when there are no ratings
- **WHEN** a Venue has zero recorded ratings
- **THEN** the storefront purchase page does not show an Avaliações tab for that Venue
