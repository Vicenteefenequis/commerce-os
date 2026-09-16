import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import type { PasswordHasherPort, UserRepositoryPort } from "../../identity/domain/ports.js";
import { InvalidUserError, User } from "../../identity/domain/user.entity.js";
import type { UserManagementRepositoryPort, UserWithAssignments } from "../domain/ports.js";
import type { VenueRepositoryPort } from "../../venue/domain/ports.js";
import type { Venue } from "../../venue/domain/venue.entity.js";
import type { Role } from "../../authorization/domain/role.js";
import { InvalidRoleAssignmentError, InvalidRoleError } from "./validate-role-and-venue.js";
import {
  AssignmentVenueNotFoundError,
  CreateUserWithRoleAssignmentUseCase,
  EmailAlreadyExistsError,
} from "./create-user-with-role-assignment.usecase.js";

class FakeUserRepository implements UserRepositoryPort {
  public created: Array<{ tenantId: string; email: string; passwordHash: string }> = [];
  constructor(private readonly existingByTenant: Map<string, Set<string>>) {}

  findByTenantAndEmail(tenantId: string, email: string): Promise<User | null> {
    const exists = this.existingByTenant.get(tenantId)?.has(email) ?? false;
    return Promise.resolve(exists ? User.create({ id: randomUUID(), tenantId, email, passwordHash: "x" }) : null);
  }
  findById(): Promise<User | null> {
    return Promise.resolve(null);
  }
  create(user: { tenantId: string; email: string; passwordHash: string }): Promise<User> {
    this.created.push(user);
    return Promise.resolve(User.create({ id: randomUUID(), ...user }));
  }
}

class FakePasswordHasher implements PasswordHasherPort {
  hash(plainPassword: string): Promise<string> {
    return Promise.resolve(`hashed:${plainPassword}`);
  }
  verify(): Promise<boolean> {
    return Promise.resolve(true);
  }
}

class FakeUserManagementRepository implements UserManagementRepositoryPort {
  public created: Array<{ tenantId: string; userId: string; role: Role; venueId: string | null }> = [];

  listUsersWithAssignments(): Promise<UserWithAssignments[]> {
    return Promise.resolve([]);
  }
  createAssignment(assignment: { tenantId: string; userId: string; role: Role; venueId: string | null }): Promise<{ id: string }> {
    this.created.push(assignment);
    return Promise.resolve({ id: randomUUID() });
  }
  revokeAssignment(): Promise<boolean> {
    return Promise.resolve(true);
  }
  userExistsInTenant(): Promise<boolean> {
    return Promise.resolve(true);
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

describe("CreateUserWithRoleAssignmentUseCase", () => {
  const tenantId = randomUUID();
  const venueId = randomUUID();
  const otherTenantVenueId = randomUUID();

  function makeUseCase(existingEmails: string[] = []) {
    const users = new FakeUserRepository(new Map([[tenantId, new Set(existingEmails)]]));
    const userManagement = new FakeUserManagementRepository();
    const venues = new FakeVenueRepository(new Map([[tenantId, new Set([venueId])]]));
    const passwordHasher = new FakePasswordHasher();
    return {
      useCase: new CreateUserWithRoleAssignmentUseCase(users, userManagement, venues, passwordHasher),
      users,
      userManagement,
    };
  }

  it("rejects an unknown role", async () => {
    const { useCase } = makeUseCase();
    await expect(
      useCase.execute({ tenantId, email: "a@b.com", password: "pw", role: "owner", venueId: null }),
    ).rejects.toBeInstanceOf(InvalidRoleError);
  });

  it("rejects a non-admin role without a Venue", async () => {
    const { useCase } = makeUseCase();
    await expect(
      useCase.execute({ tenantId, email: "a@b.com", password: "pw", role: "gerente", venueId: null }),
    ).rejects.toBeInstanceOf(InvalidRoleAssignmentError);
  });

  it("rejects an invalid email", async () => {
    const { useCase } = makeUseCase();
    await expect(
      useCase.execute({ tenantId, email: "not-an-email", password: "pw", role: "admin", venueId: null }),
    ).rejects.toBeInstanceOf(InvalidUserError);
  });

  it("rejects an empty password", async () => {
    const { useCase } = makeUseCase();
    await expect(
      useCase.execute({ tenantId, email: "a@b.com", password: "", role: "admin", venueId: null }),
    ).rejects.toBeInstanceOf(InvalidUserError);
  });

  it("rejects a duplicate email within the same Organization", async () => {
    const { useCase } = makeUseCase(["a@b.com"]);
    await expect(
      useCase.execute({ tenantId, email: "a@b.com", password: "pw", role: "admin", venueId: null }),
    ).rejects.toBeInstanceOf(EmailAlreadyExistsError);
  });

  it("rejects a Venue from another Organization", async () => {
    const { useCase } = makeUseCase();
    await expect(
      useCase.execute({ tenantId, email: "a@b.com", password: "pw", role: "vendedor", venueId: otherTenantVenueId }),
    ).rejects.toBeInstanceOf(AssignmentVenueNotFoundError);
  });

  it("creates a user with a Venue-scoped role, hashing the password", async () => {
    const { useCase, users, userManagement } = makeUseCase();
    const result = await useCase.execute({
      tenantId,
      email: "vendedor@example.com",
      password: "pw123",
      role: "vendedor",
      venueId,
    });

    expect(users.created).toEqual([{ tenantId, email: "vendedor@example.com", passwordHash: "hashed:pw123" }]);
    expect(userManagement.created).toEqual([{ tenantId, userId: result.userId, role: "vendedor", venueId }]);
    expect(result.assignmentId).toBeDefined();
  });

  it("creates a user with the Admin role and no Venue", async () => {
    const { useCase, userManagement } = makeUseCase();
    const result = await useCase.execute({
      tenantId,
      email: "admin@example.com",
      password: "pw123",
      role: "admin",
      venueId: null,
    });

    expect(userManagement.created).toEqual([{ tenantId, userId: result.userId, role: "admin", venueId: null }]);
  });
});
