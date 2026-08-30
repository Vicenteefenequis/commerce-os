import { describe, expect, it } from "vitest";
import { calculateAvailableCapacity } from "./available-capacity.js";

describe("calculateAvailableCapacity", () => {
  it("subtracts committed amount from configured capacity (spec: Available capacity reflects commitments)", () => {
    expect(calculateAvailableCapacity(100, 30)).toBe(70);
  });

  it("never goes negative when committed exceeds configured capacity (spec: Available capacity never goes negative)", () => {
    expect(calculateAvailableCapacity(100, 150)).toBe(0);
  });

  it("returns the full configured capacity when nothing is committed", () => {
    expect(calculateAvailableCapacity(100, 0)).toBe(100);
  });
});
