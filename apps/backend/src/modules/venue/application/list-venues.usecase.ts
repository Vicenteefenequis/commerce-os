import type { Venue } from "../domain/venue.entity.js";
import type { VenueRepositoryPort } from "../domain/ports.js";

/**
 * spec: foundation/venue - "Multiple venues per organization", "Venue
 * listing is scoped to the caller's assigned Venue(s)" (openspec change
 * add-venue-scoped-user-roles).
 */
export class ListVenuesUseCase {
  constructor(private readonly venues: VenueRepositoryPort) {}

  async execute(tenantId: string, venueIds?: string[]): Promise<Venue[]> {
    const all = await this.venues.listByTenant(tenantId);
    if (venueIds === undefined) return all;
    return all.filter((v) => venueIds.includes(v.id));
  }
}
