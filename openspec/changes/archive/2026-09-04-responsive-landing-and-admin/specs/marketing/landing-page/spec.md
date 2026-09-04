## ADDED Requirements

### Requirement: Primary navigation collapses on small viewports
The marketing site header SHALL present its primary navigation (site links and the primary CTA) in a mobile-usable collapsed pattern below the tablet breakpoint, rather than rendering all items in a single non-wrapping row that can overflow or crowd on narrow screens.

#### Scenario: Header collapses below the tablet breakpoint
- **WHEN** a visitor loads any marketing page at a viewport narrower than the tablet breakpoint
- **THEN** the header presents the logo and a way to reveal the navigation links and CTA (e.g. a toggle), instead of forcing all items into one row
