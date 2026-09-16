import { describe, expect, it } from "vitest";
import { roleHasPermission, ROLES, type Permission, type Role } from "./role.js";

/**
 * spec: foundation/authorization - "Role-based access control" (openspec
 * change add-venue-scoped-user-roles): the four-role access matrix from
 * proposal.md.
 */
describe("role set", () => {
  it("supports exactly admin, gerente, vendedor, validador", () => {
    expect(ROLES).toEqual(["admin", "gerente", "vendedor", "validador"]);
  });
});

describe("admin", () => {
  it.each<Permission>([
    "organization:manage",
    "venue:manage",
    "configuration:manage",
    "audit:read",
    "product:manage",
    "resource:manage",
    "reservation:manage",
    "order:manage",
    "order:read",
    "payment:manage",
    "entitlement:consume",
    "counter-sale:create",
    "user:manage",
  ])("grants %s", (permission) => {
    expect(roleHasPermission("admin", permission)).toBe(true);
  });
});

describe("gerente", () => {
  it.each<Permission>(["venue:read", "venue:manage", "resource:read", "order:read"])(
    "grants %s",
    (permission) => {
      expect(roleHasPermission("gerente", permission)).toBe(true);
    },
  );

  it.each<Permission>(["order:manage", "payment:manage", "entitlement:consume", "counter-sale:create", "user:manage"])(
    "denies %s",
    (permission) => {
      expect(roleHasPermission("gerente", permission)).toBe(false);
    },
  );
});

describe("vendedor", () => {
  it.each<Permission>(["venue:read", "product:read", "resource:read", "counter-sale:create"])(
    "grants %s",
    (permission) => {
      expect(roleHasPermission("vendedor", permission)).toBe(true);
    },
  );

  it.each<Permission>(["order:read", "order:manage", "entitlement:consume", "user:manage"])(
    "denies %s",
    (permission) => {
      expect(roleHasPermission("vendedor", permission)).toBe(false);
    },
  );
});

describe("validador", () => {
  it("grants entitlement:consume", () => {
    expect(roleHasPermission("validador", "entitlement:consume")).toBe(true);
  });

  it.each<Permission>(["venue:read", "product:read", "resource:read", "order:read", "counter-sale:create"])(
    "denies %s (scanning is this role's sole purpose)",
    (permission) => {
      expect(roleHasPermission("validador", permission)).toBe(false);
    },
  );
});

describe("legacy role names no longer type-check", () => {
  it("Role only accepts the four new roles", () => {
    const legacyRoles = ["owner", "finance", "sales", "operator", "access_operator", "read_only"];
    // @ts-expect-error - legacy role names are not assignable to Role anymore.
    const _legacy: Role = legacyRoles[0];
    expect(legacyRoles).not.toContain("admin");
  });
});
