import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { PermissionCheckUseCase } from "./permission-check.usecase.js";

describe("PermissionCheckUseCase", () => {
  const tenantId = randomUUID();
  const useCase = new PermissionCheckUseCase();

  it("allows a role that has the requested permission", () => {
    expect(
      useCase.execute({ actingTenantId: tenantId, roles: ["owner"], permission: "venue:manage" }),
    ).toBe(true);
  });

  it("denies a role without the requested permission", () => {
    expect(
      useCase.execute({
        actingTenantId: tenantId,
        roles: ["access_operator"],
        permission: "venue:manage",
      }),
    ).toBe(false);
  });

  it("denies access to a resource owned by a different tenant, regardless of role", () => {
    const otherTenantId = randomUUID();
    expect(
      useCase.execute({
        actingTenantId: tenantId,
        roles: ["owner"],
        permission: "venue:manage",
        resourceTenantId: otherTenantId,
      }),
    ).toBe(false);
  });

  it("allows when resourceTenantId matches the acting tenant", () => {
    expect(
      useCase.execute({
        actingTenantId: tenantId,
        roles: ["owner"],
        permission: "venue:manage",
        resourceTenantId: tenantId,
      }),
    ).toBe(true);
  });
});
