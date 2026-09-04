## ADDED Requirements

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
