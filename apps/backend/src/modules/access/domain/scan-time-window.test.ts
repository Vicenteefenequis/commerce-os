import { describe, expect, it } from "vitest";
import { InvalidScanPeriodError, classifyScanTime, reservationPeriodBounds } from "./scan-time-window.js";

describe("classifyScanTime", () => {
  const period = "2026-06-15";

  it("reports a scan before the period's first instant as before (spec: access/scan - Scan before a Reservation's period starts)", () => {
    expect(classifyScanTime(new Date(2026, 5, 14, 23, 59, 59, 999), period)).toBe("before");
    expect(classifyScanTime(new Date(2026, 0, 1), period)).toBe("before");
  });

  it("reports a scan within the period's calendar day as within", () => {
    expect(classifyScanTime(new Date(2026, 5, 15, 0, 0, 0, 0), period)).toBe("within");
    expect(classifyScanTime(new Date(2026, 5, 15, 14, 30), period)).toBe("within");
    expect(classifyScanTime(new Date(2026, 5, 15, 23, 59, 59, 999), period)).toBe("within");
  });

  it("reports a scan at or after the next day's first instant as after (spec: access/scan - Scan after a Reservation's period ends)", () => {
    expect(classifyScanTime(new Date(2026, 5, 16, 0, 0, 0, 0), period)).toBe("after");
    expect(classifyScanTime(new Date(2027, 0, 1), period)).toBe("after");
  });

  it("spans a whole calendar day, end-exclusive", () => {
    const { start, end } = reservationPeriodBounds(period);
    expect(start).toEqual(new Date(2026, 5, 15, 0, 0, 0, 0));
    expect(end).toEqual(new Date(2026, 5, 16, 0, 0, 0, 0));
  });

  it("handles a month boundary", () => {
    expect(classifyScanTime(new Date(2026, 5, 30, 23, 0), "2026-06-30")).toBe("within");
    expect(classifyScanTime(new Date(2026, 6, 1, 0, 1), "2026-06-30")).toBe("after");
  });

  it("rejects a period that is not an ISO calendar date", () => {
    expect(() => classifyScanTime(new Date(), "2026-06-15T10:00:00Z")).toThrow(InvalidScanPeriodError);
    expect(() => classifyScanTime(new Date(), "")).toThrow(InvalidScanPeriodError);
  });
});
