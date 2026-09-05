import { InvalidVenueError, Venue, isWellFormedUrl } from "../domain/venue.entity.js";
import type { UpdateVenueInput, VenueRepositoryPort } from "../domain/ports.js";

export class VenueNotFoundError extends Error {
  constructor() {
    super("venue not found");
  }
}

export { InvalidVenueError };

/**
 * spec: foundation/venue - "Venue profile fields are owner-editable",
 * "Venue publish toggle is owner-controlled". Tenant scoping is enforced
 * by the repository's `update(tenantId, id, ...)` matching only rows of
 * that tenant (same pattern as every other Venue operation) - an actor
 * outside the owning Organization gets the same VenueNotFoundError as a
 * truly nonexistent Venue, rather than a distinct "forbidden" signal.
 *
 * `coverPhotoUrl` is validated here, before the write, so a malformed URL
 * never reaches storage (spec: "Malformed cover photo URL is rejected" -
 * "the Venue's stored coverPhotoUrl is unchanged").
 */
export class UpdateVenueUseCase {
  constructor(private readonly venues: VenueRepositoryPort) {}

  async execute(tenantId: string, venueId: string, changes: UpdateVenueInput): Promise<Venue> {
    if (changes.coverPhotoUrl && !isWellFormedUrl(changes.coverPhotoUrl)) {
      throw new InvalidVenueError("coverPhotoUrl must be a well-formed URL");
    }
    if (
      changes.latitude !== undefined &&
      changes.latitude !== null &&
      (changes.latitude < -90 || changes.latitude > 90)
    ) {
      throw new InvalidVenueError("latitude must be between -90 and 90");
    }
    if (
      changes.longitude !== undefined &&
      changes.longitude !== null &&
      (changes.longitude < -180 || changes.longitude > 180)
    ) {
      throw new InvalidVenueError("longitude must be between -180 and 180");
    }

    const updated = await this.venues.update(tenantId, venueId, changes);
    if (!updated) throw new VenueNotFoundError();
    return updated;
  }
}
