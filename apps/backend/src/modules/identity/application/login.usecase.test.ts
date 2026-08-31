import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { LoginUseCase, InvalidCredentialsError } from "./login.usecase.js";
import { User } from "../domain/user.entity.js";
import { Session } from "../domain/session.entity.js";
import type {
  PasswordHasherPort,
  SessionRepositoryPort,
  UserRepositoryPort,
} from "../domain/ports.js";

class FakeUserRepository implements UserRepositoryPort {
  constructor(private readonly user: User | null) {}
  async findByTenantAndEmail(): Promise<User | null> {
    return this.user;
  }
  async findById(): Promise<User | null> {
    return this.user;
  }
}

class FakeSessionRepository implements SessionRepositoryPort {
  public created: { tenantId: string; userId: string; expiresAt: Date } | null = null;

  async create(session: { tenantId: string; userId: string; expiresAt: Date }) {
    this.created = session;
    return Session.create({
      id: randomUUID(),
      tenantId: session.tenantId,
      userId: session.userId,
      expiresAt: session.expiresAt,
      revokedAt: null,
    });
  }
  async findById() {
    return null;
  }
  async revoke() {}
}

class FakePasswordHasher implements PasswordHasherPort {
  constructor(private readonly matches: boolean) {}
  async hash(): Promise<string> {
    return "hash";
  }
  async verify(): Promise<boolean> {
    return this.matches;
  }
}

const tenantId = randomUUID();
const user = User.create({ id: randomUUID(), tenantId, email: "owner@example.com", passwordHash: "hash" });

describe("LoginUseCase", () => {
  it("creates a session on valid credentials", async () => {
    const sessions = new FakeSessionRepository();
    const useCase = new LoginUseCase(
      new FakeUserRepository(user),
      sessions,
      new FakePasswordHasher(true),
      3600,
    );

    const session = await useCase.execute({ tenantId, email: user.email, password: "secret" });

    expect(session.userId).toBe(user.id);
    expect(session.tenantId).toBe(tenantId);
    expect(sessions.created).not.toBeNull();
  });

  it("rejects an unknown email", async () => {
    const useCase = new LoginUseCase(
      new FakeUserRepository(null),
      new FakeSessionRepository(),
      new FakePasswordHasher(true),
      3600,
    );

    await expect(
      useCase.execute({ tenantId, email: "nope@example.com", password: "secret" }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it("rejects an invalid password", async () => {
    const useCase = new LoginUseCase(
      new FakeUserRepository(user),
      new FakeSessionRepository(),
      new FakePasswordHasher(false),
      3600,
    );

    await expect(
      useCase.execute({ tenantId, email: user.email, password: "wrong" }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });
});
