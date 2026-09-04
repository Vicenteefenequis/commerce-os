# admin/design-system Specification

## Purpose

Defines the shared visual language and component behavior every admin screen in `apps/web` is built from, so screens built against Foundation/Catalog/Capacity APIs are visually and behaviorally consistent without each one reinventing styling, accessibility, or state handling.

## Requirements

### Requirement: Consistent design tokens
All admin UI SHALL derive color, typography, spacing, and radius values from a single shared token set rather than component-local hardcoded values. This token set SHALL also be the source of truth for the public marketing surface (landing page), so a brand color or font change applies consistently to both the admin application and the marketing site.

#### Scenario: Token change propagates everywhere
- **WHEN** a token value (e.g. the primary color) is changed in the shared token set
- **THEN** every component using that token reflects the new value without per-component edits, across both the admin application and the marketing landing page

#### Scenario: New component reuses existing tokens
- **WHEN** a new admin screen or component is built
- **THEN** it is visually consistent with existing screens by construction, using the same token set

#### Scenario: Marketing surface reuses the same token set
- **WHEN** the marketing landing page renders a section using a brand, neutral, or accent color
- **THEN** it reads that value from the same shared token set the admin UI uses, not a separate marketing-only palette

### Requirement: Light and dark theme support
The admin UI SHALL render correctly in both a light and a dark theme, following the user's OS/browser preference by default.

#### Scenario: Theme follows system preference
- **WHEN** the admin is opened with no explicit theme override and the OS is set to dark mode
- **THEN** the admin renders in the dark theme with all tokens (including text/background contrast) applied consistently

### Requirement: Accessible interactive components
Interactive components (dialogs, dropdowns, selects, tabs) SHALL be operable via keyboard and expose correct ARIA semantics, not only mouse/touch.

#### Scenario: Dialog is keyboard-operable
- **WHEN** a dialog (e.g. a confirmation or a create/edit modal) is open
- **THEN** focus is trapped within it, Escape closes it, and focus returns to the triggering element on close

#### Scenario: Dropdown/select is keyboard-navigable
- **WHEN** a user operates a dropdown or select component using only the keyboard
- **THEN** they can open it, move between options with arrow keys, and select an option with Enter

### Requirement: CRUD list layout pattern
A resource list screen (e.g. venues, products, resources) SHALL follow a consistent layout: a table of records, a primary action to create a new record, and a distinguishable empty state when there are no records.

#### Scenario: Empty list shows a clear empty state
- **WHEN** a list screen has zero records to show
- **THEN** it displays an explicit empty state (not a blank table) that includes the primary create action

#### Scenario: List screen exposes a create action
- **WHEN** a user is authorized to create a record of the listed resource type
- **THEN** a create action is visible and reachable from the list screen

### Requirement: CRUD form layout pattern
A resource create/edit screen SHALL follow a consistent layout: labeled fields, inline validation error display tied to the specific field, and a persistent submit/cancel action pair.

#### Scenario: Field-level API validation errors are shown inline
- **WHEN** a create/edit submission is rejected by the backend with a field-specific error
- **THEN** the error is displayed next to the corresponding field, not only as a generic top-level message

#### Scenario: Form distinguishes unsaved changes from saved state
- **WHEN** a user has made edits that have not yet been submitted
- **THEN** the form provides a clear way to submit or discard those changes before navigating away

### Requirement: Consistent async operation feedback
Every action that triggers a network request (create, update, delete, list refresh) SHALL communicate its in-progress, success, and failure states through a consistent, shared pattern rather than ad hoc per-screen handling.

#### Scenario: In-progress action disables duplicate submission
- **WHEN** a create/update/delete request is in flight
- **THEN** the triggering action is disabled or visibly indicates loading, preventing a duplicate submission

#### Scenario: Failed action surfaces a recoverable error
- **WHEN** a network request fails (validation error, permission denied, server error)
- **THEN** the user sees a clear, non-blocking indication of the failure and can retry without reloading the page

### Requirement: Dialog content remains reachable on small viewports
The shared Dialog component SHALL cap its content height to the viewport and scroll internally when its content exceeds that height, so every action inside the dialog (including a submit/save control at the end of a long form) remains reachable regardless of screen size or an on-screen keyboard reducing available height.

#### Scenario: Long form inside a dialog stays scrollable
- **WHEN** a dialog contains a form long enough that its content exceeds the available viewport height (e.g. a product form with several variant rows, viewed on a phone with the on-screen keyboard open)
- **THEN** the dialog content scrolls internally and the submit action remains reachable, instead of being pushed off-screen with no way to scroll to it

### Requirement: Admin action rows wrap on narrow viewports
A row of adjacent action controls (e.g. buttons for status transitions on a detail screen) SHALL wrap onto multiple lines rather than overflow or compress illegibly when the viewport is too narrow to fit them on one line.

#### Scenario: Multiple action buttons on a narrow screen
- **WHEN** a screen renders multiple adjacent action buttons (e.g. Cancelar/Concluir/Reembolsar on an order detail screen) at a viewport width where they do not all fit on one line
- **THEN** the buttons wrap onto additional lines instead of overflowing the viewport or being clipped

### Requirement: List tables collapse to stacked cards on small viewports
The shared Table primitive used by CRUD list screens SHALL present its data as stacked label/value cards below the tablet breakpoint, instead of relying on horizontal scrolling as the only way to reach columns or row actions. Each cell's associated column label SHALL remain visible next to its value in the stacked layout.

#### Scenario: List table renders as cards on a narrow viewport
- **WHEN** a CRUD list screen using the shared Table (e.g. Produtos, Recursos, Pedidos, Unidades) is viewed at a viewport narrower than the tablet breakpoint
- **THEN** each record renders as a self-contained card with its column values labeled and stacked vertically, and any row action is reachable within that card without horizontal scrolling

#### Scenario: List table renders as a normal table at tablet width and above
- **WHEN** the same screen is viewed at the tablet breakpoint or wider
- **THEN** the data renders as a conventional table with column headers, unchanged from prior behavior
