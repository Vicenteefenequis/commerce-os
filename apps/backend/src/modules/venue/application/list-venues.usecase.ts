import type { Venue } from "../domain/venue.entity.js";
import type { VenueRepositoryPort } from "../domain/ports.js";

/** spec: foundation/venue - "Multiple venues per organization". */
export class ListVenuesUseCase {
  constructor(private readonly venues: VenueRepositoryPort) {}

  async execute(tenantId: string): Promise<Venue[]> {
    return this.venues.listByTenant(tenantId);
  }
}
