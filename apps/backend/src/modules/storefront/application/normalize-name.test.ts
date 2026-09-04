import { describe, expect, it } from "vitest";
import { normalizeName } from "./normalize-name.js";

describe("normalizeName", () => {
  it("matches an accented name against an unaccented query", () => {
    expect(normalizeName("bar do joao")).toBe(normalizeName("Bar do João"));
  });

  it("lowercases and trims", () => {
    expect(normalizeName("  Museu do Amanhã  ")).toBe("museu do amanha");
  });
});
