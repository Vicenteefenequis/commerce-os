import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { PermissionCheckUseCase } from "./permission-check.usecase.js";

describe("PermissionCheckUseCase", () => {
  const tenantId = randomUUID();
  const useCase = new PermissionCheckUseCase();

  it("allows a role that has the requested permission", () => {
    expect(
      useCase.execute({ actingTenantId: tenantId, roles: ["admin"], permission: "venue:manage" }),
    ).toBe(true);
  });

  it("denies a role without the requested permission", () => {
    expect(
      useCase.execute({
        actingTenantId: tenantId,
        roles: ["validador"],
        permission: "venue:manage",
      }),
    ).toBe(false);
  });

  it("denies access to a resource owned by a different tenant, regardless of role", () => {
    const otherTenantId = randomUUID();
    expect(
      useCase.execute({
        actingTenantId: tenantId,
        roles: ["admin"],
        permission: "venue:manage",
        resourceTenantId: otherTenantId,
      }),
    ).toBe(false);
  });

  it("allows when resourceTenantId matches the acting tenant", () => {
    expect(
      useCase.execute({
        actingTenantId: tenantId,
        roles: ["admin"],
        permission: "venue:manage",
        resourceTenantId: tenantId,
      }),
    ).toBe(true);
  });

  describe("Venue scope (openspec change add-venue-scoped-user-roles)", () => {
    const venueA = randomUUID();
    const venueB = randomUUID();

    it("allows an Admin (\"all\") for any resource Venue", () => {
      expect(
        useCase.execute({
          actingTenantId: tenantId,
          roles: ["admin"],
          permission: "venue:manage",
          callerVenueIds: "all",
          resourceVenueId: venueB,
        }),
      ).toBe(true);
    });

    it("allows a Gerente scoped to the resource's Venue", () => {
      expect(
        useCase.execute({
          actingTenantId: tenantId,
          roles: ["gerente"],
          permission: "venue:read",
          callerVenueIds: [venueA],
          resourceVenueId: venueA,
        }),
      ).toBe(true);
    });

    it("denies a Gerente scoped to a different Venue", () => {
      expect(
        useCase.execute({
          actingTenantId: tenantId,
          roles: ["gerente"],
          permission: "venue:read",
          callerVenueIds: [venueA],
          resourceVenueId: venueB,
        }),
      ).toBe(false);
    });
  });
});
