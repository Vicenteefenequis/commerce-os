import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { InvalidPlatformAdminError, PlatformAdmin } from "./platform-admin.entity.js";

describe("PlatformAdmin", () => {
  it("creates a valid platform admin", () => {
    const admin = PlatformAdmin.create({
      id: randomUUID(),
      email: "owner@example.com",
      passwordHash: "hash",
    });
    expect(admin.email).toBe("owner@example.com");
  });

  it("rejects an invalid email", () => {
    expect(() =>
      PlatformAdmin.create({ id: randomUUID(), email: "not-an-email", passwordHash: "hash" }),
    ).toThrow(InvalidPlatformAdminError);
  });

  it("rejects a missing password hash", () => {
    expect(() =>
      PlatformAdmin.create({ id: randomUUID(), email: "owner@example.com", passwordHash: "" }),
    ).toThrow(InvalidPlatformAdminError);
  });
});
