export const ROLES = ["admin", "gerente", "vendedor", "validador"] as const;

export type Role = (typeof ROLES)[number];

export type Permission =
  | "organization:manage"
  | "organization:read"
  | "venue:manage"
  | "venue:read"
  | "configuration:manage"
  | "configuration:read"
  | "audit:read"
  | "product:manage"
  | "product:read"
  | "resource:manage"
  | "resource:read"
  | "reservation:manage"
  | "order:manage"
  | "order:read"
  | "payment:manage"
  | "entitlement:consume"
  | "counter-sale:create"
  | "user:manage";

/**
 * openspec change add-venue-scoped-user-roles, proposal.md's access
 * matrix: replaces the old seven-role IAM-002 mapping with four roles,
 * each also constrained by Venue scope (see
 * PermissionCheckUseCase.execute's resourceVenueId check - this table
 * only decides which Permissions a role can ever hold, not which Venue).
 *
 * - admin: every permission, unrestricted (proposal - "pode fazer tudo
 *   que já tem hoje").
 * - gerente: venue:read/manage (view/edit their Venue's config),
 *   resource:read ("ver ... recursos"), order:read ("ver pedidos") -
 *   deliberately not order:manage (cancel/fulfill) or payment:manage,
 *   neither of which the proposal asked for. Monetary redaction on
 *   Order reads is a separate response-serialization concern (design.md
 *   D4), not a permission.
 * - vendedor: product:read/resource:read/venue:read (to pick what to
 *   sell) plus counter-sale:create - deliberately no order:read/manage,
 *   since the proposal restricts this role to the counter-sale screen
 *   only, not order history.
 * - validador: entitlement:consume only (scanning at the door is this
 *   role's sole purpose, same rationale the old access_operator had).
 */
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: [
    "organization:manage",
    "organization:read",
    "venue:manage",
    "venue:read",
    "configuration:manage",
    "configuration:read",
    "audit:read",
    "product:manage",
    "product:read",
    "resource:manage",
    "resource:read",
    "reservation:manage",
    "order:manage",
    "order:read",
    "payment:manage",
    "entitlement:consume",
    "counter-sale:create",
    "user:manage",
  ],
  gerente: ["venue:read", "venue:manage", "resource:read", "order:read"],
  vendedor: ["venue:read", "product:read", "resource:read", "counter-sale:create"],
  validador: ["entitlement:consume"],
};

export function roleHasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
