import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { InvalidScanAttemptError, ScanAttempt } from "./scan-attempt.entity.js";

describe("ScanAttempt", () => {
  const base = {
    id: randomUUID(),
    tenantId: randomUUID(),
    entitlementId: randomUUID(),
    ticketCode: "TCK-ABC123",
    venueId: randomUUID(),
    outcome: "authorized" as const,
    scannedAt: new Date("2026-06-15T10:00:00.000Z"),
  };

  it("records an authorized attempt against an Entitlement", () => {
    const attempt = ScanAttempt.create(base);

    expect(attempt.outcome).toBe("authorized");
    expect(attempt.authorized).toBe(true);
    expect(attempt.entitlementId).toBe(base.entitlementId);
    expect(attempt.ticketCode).toBe("TCK-ABC123");
    expect(attempt.venueId).toBe(base.venueId);
    expect(attempt.scannedAt).toEqual(base.scannedAt);
  });

  it("records a denied attempt whose code matched no Entitlement (spec: access/scan - Unknown or malformed code)", () => {
    const attempt = ScanAttempt.create({ ...base, entitlementId: null, outcome: "invalid" });

    expect(attempt.entitlementId).toBeNull();
    expect(attempt.outcome).toBe("invalid");
    expect(attempt.authorized).toBe(false);
  });

  it("requires the scanned code and the scanning session's Venue", () => {
    expect(() => ScanAttempt.create({ ...base, ticketCode: "  " })).toThrow(InvalidScanAttemptError);
    expect(() => ScanAttempt.create({ ...base, venueId: "" })).toThrow(InvalidScanAttemptError);
  });
});
