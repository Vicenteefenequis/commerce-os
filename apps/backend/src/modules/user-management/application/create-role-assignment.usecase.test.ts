import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import type { UserManagementRepositoryPort, UserWithAssignments } from "../domain/ports.js";
import type { VenueRepositoryPort } from "../../venue/domain/ports.js";
import type { Venue } from "../../venue/domain/venue.entity.js";
import type { Role } from "../../authorization/domain/role.js";
import {
  AssignmentVenueNotFoundError,
  CreateRoleAssignmentUseCase,
  InvalidRoleAssignmentError,
  InvalidRoleError,
  UserNotFoundError,
} from "./create-role-assignment.usecase.js";

class FakeUserManagementRepository implements UserManagementRepositoryPort {
  public created: Array<{ tenantId: string; userId: string; role: Role; venueId: string | null }> = [];
  constructor(private readonly existingUserIds: Set<string>) {}

  listUsersWithAssignments(): Promise<UserWithAssignments[]> {
    return Promise.resolve([]);
  }

  createAssignment(assignment: {
    tenantId: string;
    userId: string;
    role: Role;
    venueId: string | null;
  }): Promise<{ id: string }> {
    this.created.push(assignment);
    return Promise.resolve({ id: randomUUID() });
  }

  revokeAssignment(): Promise<boolean> {
    return Promise.resolve(true);
  }

  userExistsInTenant(_tenantId: string, userId: string): Promise<boolean> {
    return Promise.resolve(this.existingUserIds.has(userId));
  }
}

class FakeVenueRepository implements VenueRepositoryPort {
  constructor(private readonly venuesByTenant: Map<string, Set<string>>) {}

  create(): Promise<Venue> {
    throw new Error("not implemented");
  }
  listByTenant(): Promise<Venue[]> {
    return Promise.resolve([]);
  }
  findById(tenantId: string, id: string): Promise<Venue | null> {
    const found = this.venuesByTenant.get(tenantId)?.has(id) ?? false;
    return Promise.resolve(found ? ({ id } as Venue) : null);
  }
  findBySlug(): Promise<Venue | null> {
    return Promise.resolve(null);
  }
  update(): Promise<Venue | null> {
    return Promise.resolve(null);
  }
}

describe("CreateRoleAssignmentUseCase", () => {
  const tenantId = randomUUID();
  const userId = randomUUID();
  const venueId = randomUUID();
  const otherTenantVenueId = randomUUID();

  function makeUseCase() {
    const users = new FakeUserManagementRepository(new Set([userId]));
    const venues = new FakeVenueRepository(new Map([[tenantId, new Set([venueId])]]));
    return { useCase: new CreateRoleAssignmentUseCase(users, venues), users };
  }

  it("rejects an unknown role", async () => {
    const { useCase } = makeUseCase();
    await expect(
      useCase.execute({ tenantId, userId, role: "owner", venueId: null }),
    ).rejects.toBeInstanceOf(InvalidRoleError);
  });

  it("rejects a non-admin role without a Venue", async () => {
    const { useCase } = makeUseCase();
    await expect(
      useCase.execute({ tenantId, userId, role: "gerente", venueId: null }),
    ).rejects.toBeInstanceOf(InvalidRoleAssignmentError);
  });

  it("rejects an admin assignment that specifies a Venue", async () => {
    const { useCase } = makeUseCase();
    await expect(
      useCase.execute({ tenantId, userId, role: "admin", venueId }),
    ).rejects.toBeInstanceOf(InvalidRoleAssignmentError);
  });

  it("rejects a Venue from another Organization", async () => {
    const { useCase } = makeUseCase();
    await expect(
      useCase.execute({ tenantId, userId, role: "vendedor", venueId: otherTenantVenueId }),
    ).rejects.toBeInstanceOf(AssignmentVenueNotFoundError);
  });

  it("rejects a user outside the Organization", async () => {
    const { useCase } = makeUseCase();
    await expect(
      useCase.execute({ tenantId, userId: randomUUID(), role: "vendedor", venueId }),
    ).rejects.toBeInstanceOf(UserNotFoundError);
  });

  it("creates a valid admin assignment with no Venue", async () => {
    const { useCase, users } = makeUseCase();
    await useCase.execute({ tenantId, userId, role: "admin", venueId: null });
    expect(users.created).toEqual([{ tenantId, userId, role: "admin", venueId: null }]);
  });

  it("creates a valid Venue-scoped assignment", async () => {
    const { useCase, users } = makeUseCase();
    await useCase.execute({ tenantId, userId, role: "vendedor", venueId });
    expect(users.created).toEqual([{ tenantId, userId, role: "vendedor", venueId }]);
  });
});
