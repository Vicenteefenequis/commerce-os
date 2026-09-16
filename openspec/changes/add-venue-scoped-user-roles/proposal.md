## Why

Today every authenticated admin session can reach every admin screen and see every number (GMV, order values, all venues), regardless of the seven roles `foundation/authorization` defines (Owner/Admin/Finance/Sales/Operator/Access Operator/Read Only) — none of the admin routes actually check role against screen access, and no role is scoped to a single Venue. As organizations onboard staff who should only sell tickets at the counter, only validate entry, or only manage one specific unit, the org owner has no way to grant narrow, per-Venue access without also handing over full visibility into revenue and every other Venue's data.

## What Changes

- Replace the current role set (Owner/Admin/Finance/Sales/Operator/Access Operator/Read Only) with four roles: **Admin**, **Gerente**, **Vendedor**, **Validador**. **BREAKING**: existing `role_assignments` rows using the old role names stop mapping to any permission.
- Add Venue-scoped role assignment: a role assignment SHALL optionally bind to one specific Venue. Admin assignments remain organization-wide (no Venue); Gerente/Vendedor/Validador assignments SHALL each be bound to exactly one Venue. A user may hold more than one role assignment (e.g. Vendedor and Validador on the same Venue).
- Enforce Venue scope on every permission check, not just Organization/tenant membership: a Gerente/Vendedor/Validador SHALL be denied access to any Venue-owned resource outside their assigned Venue(s).
- Gate each admin screen by role instead of "any authenticated session":
  - Admin: unrestricted, all Venues.
  - Gerente: Venues (view/edit config of their assigned Venue), Pedidos (view, status only — no monetary amounts), Recursos. No Dashboard access (GMV and other aggregate financial figures never load for this role).
  - Vendedor: Balcão (counter sale) only, restricted to their assigned Venue. No other nav entry is rendered.
  - Validador: Scanner (ticket validation, manual and platform-issued tickets alike — both already funnel through the same scan flow) only, restricted to their assigned Venue. No other nav entry is rendered.
- Add a new "Usuários" admin screen, visible only to Admin, to list an Organization's users and assign/revoke a role (optionally bound to a Venue) per user.
- Redact monetary fields (order/line amounts) from order data returned to a Gerente; status and non-monetary fields remain visible.

## Capabilities

### New Capabilities
- `foundation/user-management`: lets an Admin list an Organization's users and create/update/revoke their role assignments, each optionally scoped to one Venue.

### Modified Capabilities
- `foundation/authorization`: replaces the role enum (Owner/Admin/Finance/Sales/Operator/Access Operator/Read Only → Admin/Gerente/Vendedor/Validador); adds Venue as an optional scope on a role assignment; permission checks must validate Venue scope in addition to tenant/Organization membership.
- `admin/dashboard`: restricts access to the Admin role; Gerente/Vendedor/Validador SHALL NOT be able to load the dashboard summary.
- `admin/counter-sale`: restricts counter sale creation to Admin or Vendedor, and (for Vendedor) only for the Venue(s) they're assigned to, replacing the current "any authenticated admin session" rule.
- `access/scan`: restricts scan requests to Admin or Validador, and (for Validador) only for the Venue(s) they're assigned to.
- `commerce/order`: retrieving Orders as a Gerente SHALL omit monetary fields (order/line amounts); Gerente order retrieval is additionally restricted to their assigned Venue(s).

## Impact

- **Schema**: `role_assignments` gains a nullable `venue_id` column; existing role values need a data migration/backfill to the new four-role set (or a decision to reset assignments — flagged for `design.md`).
- **Backend**: `apps/backend/src/modules/authorization/*` (role enum, `ROLE_PERMISSIONS`, `PermissionCheckUseCase`, `require-permission.middleware.ts`), `resolve-identity.ts`, and every route currently gated only by tenant (`counter-sale.routes.ts`, `scan.routes.ts`, `dashboard.routes.ts`, order retrieval routes) need Venue-aware authorization; new routes for user/role-assignment management.
- **Frontend**: `apps/web/components/layout/admin-nav.tsx` (role-aware nav filtering), `apps/web/app/admin/dashboard`, `/admin/orders`, `/admin/counter-sales`, `/admin/scan` (Venue-scoped selectors, redacted fields), new `/admin/users` screen.
- **Migration/rollout**: existing users holding one of the seven legacy roles need to be remapped to the new four roles before old role checks are removed.
