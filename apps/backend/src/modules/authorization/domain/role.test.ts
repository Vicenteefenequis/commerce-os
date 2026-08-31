import { describe, expect, it } from "vitest";
import { roleHasPermission, type Role } from "./role.js";

/**
 * spec: access/scan - "Scanning requires the entitlement:consume
 * permission" (add-access-control design.md D7).
 */
describe("entitlement:consume role mapping", () => {
  it.each<Role>(["access_operator", "owner", "admin"])("grants %s the permission", (role) => {
    expect(roleHasPermission(role, "entitlement:consume")).toBe(true);
  });

  it.each<Role>(["sales", "operator", "finance", "read_only"])("denies %s the permission", (role) => {
    expect(roleHasPermission(role, "entitlement:consume")).toBe(false);
  });

  it("does not widen access_operator beyond scanning and reading its Venue", () => {
    expect(roleHasPermission("access_operator", "order:manage")).toBe(false);
    expect(roleHasPermission("access_operator", "product:read")).toBe(false);
    expect(roleHasPermission("access_operator", "venue:read")).toBe(true);
  });
});
