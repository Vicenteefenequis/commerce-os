import type { Venue } from "./venue.entity.js";

export interface VenueRepositoryPort {
  create(venue: { id: string; tenantId: string; name: string }): Promise<Venue>;
  listByTenant(tenantId: string): Promise<Venue[]>;
}
