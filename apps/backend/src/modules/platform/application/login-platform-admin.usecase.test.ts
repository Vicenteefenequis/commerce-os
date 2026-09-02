import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import {
  InvalidPlatformCredentialsError,
  LoginPlatformAdminUseCase,
} from "./login-platform-admin.usecase.js";
import { PlatformAdmin } from "../domain/platform-admin.entity.js";
import { PlatformSession } from "../domain/platform-session.entity.js";
import type { PlatformAdminRepositoryPort, PlatformSessionRepositoryPort } from "../domain/ports.js";
import type { PasswordHasherPort } from "../../identity/domain/ports.js";

class FakePlatformAdminRepository implements PlatformAdminRepositoryPort {
  constructor(private readonly admin: PlatformAdmin | null) {}
  async findByEmail(): Promise<PlatformAdmin | null> {
    return this.admin;
  }
  async findById(): Promise<PlatformAdmin | null> {
    return this.admin;
  }
}

class FakePlatformSessionRepository implements PlatformSessionRepositoryPort {
  public created: { adminId: string; expiresAt: Date } | null = null;

  async create(session: { adminId: string; expiresAt: Date }) {
    this.created = session;
    return PlatformSession.create({
      id: randomUUID(),
      adminId: session.adminId,
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

const admin = PlatformAdmin.create({ id: randomUUID(), email: "owner@example.com", passwordHash: "hash" });

describe("LoginPlatformAdminUseCase", () => {
  it("creates a session on valid credentials", async () => {
    const sessions = new FakePlatformSessionRepository();
    const useCase = new LoginPlatformAdminUseCase(
      new FakePlatformAdminRepository(admin),
      sessions,
      new FakePasswordHasher(true),
      3600,
    );

    const session = await useCase.execute({ email: admin.email, password: "secret" });

    expect(session.adminId).toBe(admin.id);
    expect(sessions.created).not.toBeNull();
  });

  it("rejects an unknown email", async () => {
    const useCase = new LoginPlatformAdminUseCase(
      new FakePlatformAdminRepository(null),
      new FakePlatformSessionRepository(),
      new FakePasswordHasher(true),
      3600,
    );

    await expect(
      useCase.execute({ email: "nope@example.com", password: "secret" }),
    ).rejects.toBeInstanceOf(InvalidPlatformCredentialsError);
  });

  it("rejects an invalid password", async () => {
    const useCase = new LoginPlatformAdminUseCase(
      new FakePlatformAdminRepository(admin),
      new FakePlatformSessionRepository(),
      new FakePasswordHasher(false),
      3600,
    );

    await expect(
      useCase.execute({ email: admin.email, password: "wrong" }),
    ).rejects.toBeInstanceOf(InvalidPlatformCredentialsError);
  });
});
