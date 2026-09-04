import { describe, expect, it } from "vitest";
import { InvalidVenueError, Venue } from "./venue.entity.js";

describe("Venue", () => {
  const base = { id: "v1", tenantId: "t1", name: "Zoo Municipal", slug: "zoo-municipal" };

  it("defaults to unpublished with no profile fields set", () => {
    const venue = Venue.create(base);

    expect(venue.published).toBe(false);
    expect(venue.description).toBeNull();
    expect(venue.address).toBeNull();
    expect(venue.city).toBeNull();
    expect(venue.category).toBeNull();
    expect(venue.coverPhotoUrl).toBeNull();
  });

  it("accepts profile fields and a published flag", () => {
    const venue = Venue.create({
      ...base,
      description: "Um zoológico municipal",
      address: "Rua das Flores, 100",
      city: "São Paulo",
      category: "Parque",
      coverPhotoUrl: "https://example.com/photo.jpg",
      published: true,
    });

    expect(venue.published).toBe(true);
    expect(venue.description).toBe("Um zoológico municipal");
    expect(venue.address).toBe("Rua das Flores, 100");
    expect(venue.city).toBe("São Paulo");
    expect(venue.category).toBe("Parque");
    expect(venue.coverPhotoUrl).toBe("https://example.com/photo.jpg");
  });

  it("rejects a malformed cover photo URL", () => {
    expect(() => Venue.create({ ...base, coverPhotoUrl: "not-a-url" })).toThrow(InvalidVenueError);
  });
});
