import { randomUUID } from "node:crypto";
import type { OrganizationRepositoryPort } from "../../organization/domain/ports.js";
import { Venue } from "../domain/venue.entity.js";
import type { VenueRepositoryPort } from "../domain/ports.js";

export class ParentOrganizationNotFoundError extends Error {
  constructor() {
    super("parent organization does not exist");
  }
}

export interface CreateVenueInput {
  tenantId: string;
  name: string;
}

/**
 * BKG/spec: foundation/venue - creates a Venue under an existing
 * Organization. Validates the parent via a direct synchronous call into
 * Organization's repository port (design.md D6: direct calls for
 * synchronous reads across modules within the monolith).
 */
export class CreateVenueUseCase {
  constructor(
    private readonly organizations: OrganizationRepositoryPort,
    private readonly venues: VenueRepositoryPort,
  ) {}

  async execute(input: CreateVenueInput): Promise<Venue> {
    const organization = await this.organizations.findById(input.tenantId);
    if (!organization) {
      throw new ParentOrganizationNotFoundError();
    }

    return this.venues.create({ id: randomUUID(), tenantId: input.tenantId, name: input.name });
  }
}
