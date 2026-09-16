## 1. Schema

- [ ] 1.1 Add a migration adding `role_assignments.venue_id uuid null references venues(id)` and a unique constraint on `(tenant_id, user_id, role, venue_id)`; verify the migration applies cleanly on a fresh DB and on a DB seeded with existing legacy-role rows.
- [ ] 1.2 Update RLS policies on every Venue-owned table (`venues`, `products`, `product_variants`, `resources`, `resource_capacity_periods`, `resource_capacity_commitments`, `reservations`, `orders`, `order_lines`, `entitlements`, `tickets`, `scan_attempts`) to add the `app.venue_ids` clause from design.md D3; verify with a policy-level test (or integration test per table) that a session with `app.venue_ids` set to one Venue cannot read/write rows for another Venue in the same tenant.

## 2. Authorization core

- [ ] 2.1 Replace `ROLES` and rewrite `ROLE_PERMISSIONS` in `apps/backend/src/modules/authorization/domain/role.ts` for the four roles (Admin, Gerente, Vendedor, Validador) per the proposal's access matrix, add the `user:manage` permission (Admin only); verify `role.test.ts` covers the new matrix (which role has which permission) and the removed roles no longer type-check.
- [ ] 2.2 Extend `Identity` (`apps/backend/src/http/identity.ts`) with `venueIds: string[] | "all"`, and extend `resolveIdentity`/`role-assignment-repository.kysely.ts` to resolve it from `role_assignments.venue_id` (null → `"all"` only for `admin` rows, per-Venue rows collected otherwise); verify with a unit test for a user holding multiple Venue-scoped assignments.
- [ ] 2.3 Extend `PermissionCheckUseCase` to accept an optional `resourceVenueId` and deny when the caller's `venueIds` doesn't include it (and isn't `"all"`); verify `permission-check.usecase.test.ts` covers an Admin (all), a Gerente/Vendedor/Validador matching Venue, and one on a different Venue.
- [ ] 2.4 Update `txRoute` (and `txRouteWithTenant`) in `apps/backend/src/http/tx-route.ts` to also `set_config('app.venue_ids', ...)` from `req.identity.venueIds`, encoding `"all"` as the empty-string sentinel from design.md D3; verify with an integration test that two Venues' data stay isolated through a real route round-trip, mirroring the existing tenant-isolation tests.

## 3. New capability: foundation/user-management

- [ ] 3.1 Add domain types/ports for listing an Organization's users with their role assignments, and creating/revoking a role assignment (role + optional Venue), gated by `user:manage`; verify unit tests for the validation rules in `specs/foundation/user-management/spec.md` (Venue required for non-Admin roles, rejected for Admin, cross-org Venue rejected).
- [ ] 3.2 Implement the Kysely repository and Express routes for list/create/revoke, wired through `requirePermission("user:manage")`; verify route-level tests for 401 (no session), 403 (non-admin), and success paths.
- [ ] 3.3 Verify revocation takes effect immediately: an integration test that revokes an assignment mid-session and confirms the next request using that permission is denied without requiring logout.

## 4. Admin dashboard gating

- [ ] 4.1 Add a role check to the dashboard summary route (`apps/backend/src/modules/admin/infrastructure/dashboard.routes.ts`) denying any identity without the Admin role; verify with a route test asserting Gerente/Vendedor/Validador get 403.
- [ ] 4.2 Update the post-login redirect to send non-Admin roles to the first screen their role permits instead of the Dashboard; verify with a frontend test or manual walkthrough per role.

## 5. Counter sale gating

- [ ] 5.1 Update `counter-sale.routes.ts`/its permission check to require Admin or Vendedor scoped to the sale's Venue instead of "any authenticated session"; verify route tests for Admin (any Venue), Vendedor (own Venue), Vendedor (other Venue → denied), Gerente/Validador (denied).

## 6. Scan gating

- [ ] 6.1 Update `scan.routes.ts` to check `entitlement:consume` against the scan's Venue via the extended `PermissionCheckUseCase`; verify route tests for Admin (any Venue), Validador (own Venue), Validador (other Venue → denied).

## 7. Order retrieval: redaction and Venue scope

- [ ] 7.1 Add the shared Order response serializer that strips monetary fields (line prices, totals, Payment amount/refunded amount) when the caller's role is Gerente, and reuse it in both the list and detail routes; verify tests asserting Gerente responses omit those fields while Admin responses don't.
- [ ] 7.2 Ensure Gerente order list/detail queries are scoped by `app.venue_ids` (should fall out of task 1.2/2.4 automatically since Orders are Venue-owned); verify with a test that a Gerente scoped to Venue A never sees an Order belonging to Venue B, including a direct detail lookup by id.

## 8. Frontend

- [ ] 8.1 Update `apps/web/components/layout/admin-nav.tsx` (and `-client.tsx`) to filter links by the resolved identity's role: Admin sees all incl. new "Usuários"; Gerente sees Unidades/Pedidos/Recursos only; Vendedor sees only Venda no balcão; Validador sees only Scanner; verify with a component test per role.
- [ ] 8.2 Update the Pedidos screen to hide monetary columns/fields when the session's role is Gerente (matching the backend redaction), showing status and other fields as normal; verify with a component test.
- [ ] 8.3 Build the new `/admin/users` screen (Admin only): list users with their role/Venue assignments, and a form to create/revoke an assignment (role + Venue picker, Venue picker disabled/hidden for Admin role); verify by exercising create and revoke through the running app.
- [ ] 8.4 Ensure the Venue selector on Dashboard/Pedidos/Unidades only offers Venues the session is scoped to (Admin: all; others: their assigned Venue(s)); verify with a component test.

## 9. Migration and rollout

- [ ] 9.1 Write the one-off data migration script per design.md's Migration Plan: remap `owner`/`admin` role rows to `admin` (venue_id null); move `finance`/`sales`/`operator`/`access_operator`/`read_only` rows to an archive table/audit record and delete them from `role_assignments`; verify by running it against a seeded copy of production-shaped data and diffing before/after row counts.
- [ ] 9.2 Add a startup/deploy check (or documented manual step) confirming no `role_assignments` row references a role outside the new four before the old `ROLES` values are removed from code; verify the check fails loudly against unmigrated data.

## 10. End-to-end verification

- [ ] 10.1 Run the full backend and frontend test suites and confirm they pass with the new role model.
- [ ] 10.2 Manually walk through the four roles in the running app (Admin, Gerente, Vendedor, Validador) confirming nav visibility, Venue scoping, and the GMV/monetary redaction match the proposal's access matrix.
