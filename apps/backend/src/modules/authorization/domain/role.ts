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
  | "audit:read";

/**
 * IAM-002: fixed role -> permission mapping for the Foundation phase.
 * Custom/user-defined roles are explicitly out of scope (design.md D8).
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
  ],
  admin: [
    "organization:read",
    "venue:manage",
    "venue:read",
    "configuration:manage",
    "configuration:read",
    "audit:read",
  ],
  finance: ["organization:read", "venue:read", "configuration:read", "audit:read"],
  sales: ["organization:read", "venue:read"],
  operator: ["organization:read", "venue:read"],
  access_operator: ["venue:read"],
  read_only: ["organization:read", "venue:read", "configuration:read"],
};

export function roleHasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
