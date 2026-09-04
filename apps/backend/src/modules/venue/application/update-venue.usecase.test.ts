import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { InvalidVenueError, UpdateVenueUseCase, VenueNotFoundError } from "./update-venue.usecase.js";
import { Venue } from "../domain/venue.entity.js";
import type { UpdateVenueInput, VenueRepositoryPort } from "../domain/ports.js";

class FakeVenueRepository implements VenueRepositoryPort {
  constructor(private venues: Venue[]) {}
  async create(): Promise<Venue> {
    throw new Error("not used in this test");
  }
  async listByTenant(): Promise<Venue[]> {
    throw new Error("not used in this test");
  }
  async findById(): Promise<Venue | null> {
    throw new Error("not used in this test");
  }
  async findBySlug(): Promise<Venue | null> {
    throw new Error("not used in this test");
  }
  async update(tenantId: string, id: string, changes: UpdateVenueInput): Promise<Venue | null> {
    const index = this.venues.findIndex((v) => v.tenantId === tenantId && v.id === id);
    const current = this.venues[index];
    if (!current) return null;
    const updated = Venue.create({
      id: current.id,
      tenantId: current.tenantId,
      name: current.name,
      slug: current.slug,
      description: changes.description !== undefined ? changes.description : current.description,
      address: changes.address !== undefined ? changes.address : current.address,
      city: changes.city !== undefined ? changes.city : current.city,
      category: changes.category !== undefined ? changes.category : current.category,
      coverPhotoUrl: changes.coverPhotoUrl !== undefined ? changes.coverPhotoUrl : current.coverPhotoUrl,
      published: changes.published !== undefined ? changes.published : current.published,
    });
    this.venues[index] = updated;
    return updated;
  }
}

describe("UpdateVenueUseCase", () => {
  const tenantId = randomUUID();
  const venueId = randomUUID();

  function seedRepo() {
    const venue = Venue.create({ id: venueId, tenantId, name: "Unidade Norte", slug: "unidade-norte" });
    return new FakeVenueRepository([venue]);
  }

  it("updates profile fields for an authorized tenant", async () => {
    const useCase = new UpdateVenueUseCase(seedRepo());

    const updated = await useCase.execute(tenantId, venueId, {
      description: "Uma unidade",
      city: "São Paulo",
      category: "Bar",
      coverPhotoUrl: "https://example.com/photo.jpg",
    });

    expect(updated.description).toBe("Uma unidade");
    expect(updated.city).toBe("São Paulo");
    expect(updated.category).toBe("Bar");
    expect(updated.coverPhotoUrl).toBe("https://example.com/photo.jpg");
  });

  it("toggles published independently of profile fields", async () => {
    const useCase = new UpdateVenueUseCase(seedRepo());

    const published = await useCase.execute(tenantId, venueId, { published: true });
    expect(published.published).toBe(true);

    const unpublished = await useCase.execute(tenantId, venueId, { published: false });
    expect(unpublished.published).toBe(false);
  });

  it("rejects a malformed cover photo URL without writing it", async () => {
    const repo = seedRepo();
    const useCase = new UpdateVenueUseCase(repo);

    await expect(
      useCase.execute(tenantId, venueId, { coverPhotoUrl: "not-a-url" }),
    ).rejects.toBeInstanceOf(InvalidVenueError);

    const unchanged = await repo.update(tenantId, venueId, {});
    expect(unchanged?.coverPhotoUrl).toBeNull();
  });

  it("denies an actor outside the owning organization", async () => {
    const repo = seedRepo();
    const useCase = new UpdateVenueUseCase(repo);
    const otherTenantId = randomUUID();

    await expect(
      useCase.execute(otherTenantId, venueId, { description: "hijacked" }),
    ).rejects.toBeInstanceOf(VenueNotFoundError);
  });
});
