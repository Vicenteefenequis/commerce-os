import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { Session } from "./session.entity.js";

describe("Session", () => {
  const base = { id: randomUUID(), tenantId: randomUUID(), userId: randomUUID() };

  it("is valid when not expired and not revoked", () => {
    const session = Session.create({
      ...base,
      expiresAt: new Date("2030-01-01T00:00:00Z"),
      revokedAt: null,
    });
    expect(session.isValid(new Date("2029-01-01T00:00:00Z"))).toBe(true);
  });

  it("is invalid once expired", () => {
    const session = Session.create({
      ...base,
      expiresAt: new Date("2020-01-01T00:00:00Z"),
      revokedAt: null,
    });
    expect(session.isValid(new Date("2021-01-01T00:00:00Z"))).toBe(false);
  });

  it("is invalid once revoked, even before expiry", () => {
    const session = Session.create({
      ...base,
      expiresAt: new Date("2030-01-01T00:00:00Z"),
      revokedAt: new Date("2024-01-01T00:00:00Z"),
    });
    expect(session.isValid(new Date("2025-01-01T00:00:00Z"))).toBe(false);
  });
});
