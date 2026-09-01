# access/scanner Specification

## Purpose

Gives an access operator a real-time UI to validate a Ticket's code against the existing `access/scan` capability, so entry can be granted or denied without anyone calling the API by hand.

## Requirements

### Requirement: Scanner UI requires an authenticated, permitted session
The scanner screen SHALL be accessible only to an authenticated session holding the `entitlement:consume` permission, and SHALL redirect any other request away from it.

#### Scenario: Unauthenticated request is redirected
- **WHEN** a request without a valid session accesses the scanner screen
- **THEN** the response redirects to the login screen instead of rendering the scanner

#### Scenario: Authenticated session without the required permission cannot scan
- **WHEN** an authenticated session lacking `entitlement:consume` submits a scan
- **THEN** the underlying `POST /access/scan` request is rejected by the existing server-side permission check, and the UI surfaces that denial

### Requirement: Scanner requires an explicit Venue selection before scanning
The scanner screen SHALL require the operator to select a Venue before it accepts a scan, and SHALL include that Venue on every scan request.

#### Scenario: Scanning is blocked until a Venue is selected
- **WHEN** an operator has not selected a Venue
- **THEN** the scanner screen does not submit a scan

#### Scenario: Selected Venue is sent with every scan
- **WHEN** an operator with a selected Venue submits a scanned or entered code
- **THEN** the UI sends that Venue's id on the scan request

### Requirement: Scanner displays each of the six scan outcomes distinctly
The scanner screen SHALL visually distinguish the outcome of a scan among: authorized, already used, invalid, wrong venue, wrong time, and expired.

#### Scenario: Each outcome is shown distinctly
- **WHEN** a scan resolves to any of the six outcomes `access/scan` defines
- **THEN** the scanner screen displays that specific outcome to the operator, not a generic success/failure indicator

### Requirement: Scanner supports both camera scanning and manual code entry
The scanner screen SHALL accept a Ticket code either from a device camera scan or from manual text entry, so operation is not blocked by camera availability or a damaged code.

#### Scenario: Manual entry works without a camera
- **WHEN** an operator types a Ticket code into the scanner screen instead of scanning it
- **THEN** the screen submits that code the same way it would a camera-scanned code

### Requirement: Scanner is ready for the next scan immediately after showing a result
The scanner screen SHALL return to a ready-to-scan state right after displaying an outcome, without requiring extra navigation, so consecutive visitors do not create a queue.

#### Scenario: Screen resets after showing an outcome
- **WHEN** a scan outcome has been displayed
- **THEN** the screen is ready to accept the next scan without the operator navigating away and back
