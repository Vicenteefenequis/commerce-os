## 1. Entitlement consumption

- [x] 1.1 Extend `EntitlementStatus` to `"issued" | "consumed"` in the domain entity, adding a `consume()` method that only transitions from `issued`; verify unit tests reject consuming an already-`consumed` Entitlement (spec: ticketing/entitlement "Consumed Entitlement rejects further scans")
- [x] 1.2 Add a repository method for the atomic conditional update (`UPDATE ... WHERE status = 'issued'`, mirroring `commit-capacity.usecase.ts`'s optimistic-concurrency style per design.md D5); verify a test asserting a second concurrent call affects zero rows
- [x] 1.3 Verify race behavior end-to-end: two concurrent consume calls against the same Entitlement result in exactly one success (spec: ticketing/entitlement "Concurrent scans on the same Entitlement resolve to a single consumption")

## 2. Scan attempt record

- [x] 2.1 Add a `scan_attempts` table (id, tenant_id, entitlement_id nullable, ticket_code, venue_id, outcome, scanned_at) and matching migration; verify migration applies cleanly
- [x] 2.2 Add `ScanAttempt` domain entity/repository (append-only, no update method); verify unit test for creation

## 3. Access permission

- [x] 3.1 Add `entitlement:consume` to the `Permission` union and to `access_operator`, `owner`, `admin` in `ROLE_PERMISSIONS` (`authorization/domain/role.ts`); verify unit test asserts `roleHasPermission("access_operator", "entitlement:consume")` is true and false for `sales`/`operator`/`finance`/`read_only`

## 4. Scan use case

- [x] 4.1 Add `access` module skeleton (domain/application/infrastructure, mirroring `ticketing`'s layout); verify module compiles with no routes wired yet
- [x] 4.2 Implement `ScanTicketUseCase(code, venueId, tenantId)`: resolve Ticket by code -> Entitlement -> Order; classify outcome per design.md decisions D2-D4 (invalid if code not found; wrong venue if `Order.venueId != venueId`; already used if status is `consumed`; when the Order line's Reservation exists, wrong time if `now` is before its `period` start, expired if `now` is after its `period` end; otherwise consume and report authorized); verify unit tests for each of the six outcomes (spec: access/scan "Scan outcome is classified unambiguously", "Wrong venue is detected against the Order's Venue", "Wrong time and expired are detected only for Reservation-backed Entitlements")
- [x] 4.3 Record a `ScanAttempt` for every outcome, including denials; verify unit test asserts a record exists after a denied scan (spec: access/scan "Every scan attempt is recorded")
- [x] 4.4 Verify Entitlement consumption only happens on the authorized path and never on any denial path (unit test covering all five denial outcomes leave status unchanged)

## 5. HTTP surface

- [x] 5.1 Add `POST /access/scan` route (body: `{ code, venueId }`) wired through `requirePermission("entitlement:consume")`; verify request without the permission is denied (spec: access/scan "Scanning requires the entitlement:consume permission")
- [x] 5.2 Map each classification to its response shape (e.g. `{ outcome: "authorized" | "already_used" | "invalid" | "wrong_venue" | "wrong_time" | "expired" }`); verify an integration test per outcome hitting the route
- [x] 5.3 Verify tenant isolation: a scan against a Ticket code belonging to another Organization returns the same result as an unknown code (spec: access/scan "Access Control is isolated by tenant")
- [x] 5.4 Verify a request with no `venueId` is rejected before any Ticket lookup (spec: access/scan "Scan is evaluated against an explicitly selected Venue")

## 6. Wiring and verification

- [x] 6.1 Register the new route in the app's route composition alongside existing module routes; verify app boots
- [x] 6.2 Run full backend test suite and confirm no regression in existing ticketing/entitlement tests after the status enum change
- [x] 6.3 Update `docs/ROADMAP.md` M5 entry to reference this change once merged (done at archive time, not here)

## 7. Explicitly out of scope (not tasked here)

- [ ] 7.1 Scanner PWA/web UI - tracked as a future change (proposal.md - Impact)
- [ ] 7.2 Offline/intermittent-connectivity strategy (ACS-006) - tracked as future work per PRD
- [ ] 7.3 Multi-use tickets (TKT-006) - out of MVP scope per proposal.md
