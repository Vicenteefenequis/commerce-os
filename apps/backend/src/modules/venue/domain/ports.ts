import type { Venue } from "./venue.entity.js";

export interface VenueRepositoryPort {
  create(venue: { id: string; tenantId: string; name: string; slug: string }): Promise<Venue>;
  listByTenant(tenantId: string): Promise<Venue[]>;
  /**
   * Tenant-scoped lookup: a Venue from another Organization resolves to
   * null, which is what lets Access Control validate that the Venue an
   * operator selected for their scanning session is one of the caller's
   * own (add-access-control design.md D1).
   */
  findById(tenantId: string, id: string): Promise<Venue | null>;
  /** Same tenant-scoping as findById, keyed by slug instead of id (add-storefront-tenant-landing). */
  findBySlug(tenantId: string, slug: string): Promise<Venue | null>;
}
