## Purpose

Keeps the `apps/web` admin UI in sync with the caller's actual session: protected screens are inaccessible while logged out, the login screen is inaccessible while logged in, the nav reflects who is signed in, and a session can be ended from the UI.

## ADDED Requirements

### Requirement: Protected admin screens require an authenticated session
An admin screen that requires authentication (`/venues`, `/products`, `/resources`) SHALL redirect an unauthenticated request to the login screen instead of rendering.

#### Scenario: Logged-out user requests a protected screen
- **WHEN** a request without a valid session cookie is made to `/venues`, `/products`, or `/resources`
- **THEN** the response is a redirect to the login screen, and no data from that screen is rendered

#### Scenario: Logged-in user requests a protected screen
- **WHEN** a request with a valid session cookie is made to `/venues`, `/products`, or `/resources`
- **THEN** the screen renders normally

### Requirement: Login screen is inaccessible to an authenticated session
The login screen SHALL redirect an already-authenticated request away from itself instead of rendering the login form.

#### Scenario: Logged-in user requests the login screen
- **WHEN** a request with a valid session cookie is made to the login screen
- **THEN** the response is a redirect away from the login screen, and the login form is not rendered

#### Scenario: Logged-out user requests the login screen
- **WHEN** a request without a valid session cookie is made to the login screen
- **THEN** the login form renders

### Requirement: Navigation reflects current session state
The admin navigation SHALL display the current session's user email and organization name when authenticated, and SHALL display the entry point to log in when not authenticated.

#### Scenario: Nav shows user and organization identity when authenticated
- **WHEN** the admin navigation renders for a request with a valid session cookie
- **THEN** it displays that session's user email and organization name instead of a "log in" link

#### Scenario: Nav shows login entry point when unauthenticated
- **WHEN** the admin navigation renders for a request without a valid session cookie
- **THEN** it displays a "log in" link

### Requirement: Session can be ended from the admin UI
An authenticated user SHALL be able to end their session from the admin navigation.

#### Scenario: User ends their session
- **WHEN** an authenticated user triggers the sign-out control in the admin navigation
- **THEN** the session is invalidated, the session cookie is cleared, and the user is redirected to the login screen
