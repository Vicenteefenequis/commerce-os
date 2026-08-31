export const ROLES = [
  "owner",
  "admin",
  "finance",
  "sales",
  "operator",
  "access_operator",
  "read_only",
] as const;

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
  | "reservation:manage";

/**
 * IAM-002: fixed role -> permission mapping for the Foundation phase.
 * Custom/user-defined roles are explicitly out of scope (design.md D8).
 *
 * product/resource:read are granted to every role that already reads
 * venue (catalog and capacity are read to sell/plan), except
 * access_operator, whose job (PRD persona "Operador de acesso") is
 * scanning tickets, not browsing catalog/capacity. manage is limited to
 * owner/admin, consistent with venue:manage.
 *
 * reservation:manage is limited to owner/admin for this change: the
 * reservation routes are an internal-only surface with no production
 * caller yet (design.md Non-Goals) - Checkout (sales/operator) and
 * Access Control (access_operator) will need it once they call these
 * use cases, which is out of scope here.
 */
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  owner: [
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
  ],
  admin: [
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
  ],
  finance: [
    "organization:read",
    "venue:read",
    "configuration:read",
    "audit:read",
    "product:read",
    "resource:read",
  ],
  sales: ["organization:read", "venue:read", "product:read", "resource:read"],
  operator: ["organization:read", "venue:read", "product:read", "resource:read"],
  access_operator: ["venue:read"],
  read_only: [
    "organization:read",
    "venue:read",
    "configuration:read",
    "product:read",
    "resource:read",
  ],
};

export function roleHasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
