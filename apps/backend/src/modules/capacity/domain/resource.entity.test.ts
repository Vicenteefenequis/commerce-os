import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { InvalidResourceError, Resource } from "./resource.entity.js";

describe("Resource", () => {
  const tenantId = randomUUID();
  const venueId = randomUUID();

  it("requires a name", () => {
    expect(() =>
      Resource.create({ id: randomUUID(), tenantId, venueId, name: "", defaultCapacity: 100, hardCapacity: false }),
    ).toThrow(InvalidResourceError);
  });

  it("requires a non-negative integer default capacity", () => {
    expect(() =>
      Resource.create({ id: randomUUID(), tenantId, venueId, name: "Portão", defaultCapacity: -1, hardCapacity: false }),
    ).toThrow(InvalidResourceError);
  });

  it("creates a valid resource", () => {
    const resource = Resource.create({
      id: randomUUID(),
      tenantId,
      venueId,
      name: "Portão principal",
      defaultCapacity: 500,
      hardCapacity: true,
    });
    expect(resource.defaultCapacity).toBe(500);
    expect(resource.hardCapacity).toBe(true);
  });
});
