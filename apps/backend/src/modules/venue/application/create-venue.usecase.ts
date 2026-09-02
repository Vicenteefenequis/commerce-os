import { randomUUID } from "node:crypto";
import type { OrganizationRepositoryPort } from "../../organization/domain/ports.js";
import { isValidSlug, slugify } from "../../../shared-kernel/slug.js";
import { InvalidVenueError, Venue } from "../domain/venue.entity.js";
import type { VenueRepositoryPort } from "../domain/ports.js";

export class ParentOrganizationNotFoundError extends Error {
  constructor() {
    super("parent organization does not exist");
  }
}

export class InvalidVenueSlugError extends Error {
  constructor() {
    super("slug must be lowercase letters, numbers, and single hyphens");
  }
}

export class VenueSlugAlreadyExistsError extends Error {
  constructor() {
    super("a venue with this slug already exists for this organization");
  }
}

export interface CreateVenueInput {
  tenantId: string;
  name: string;
  /** Editable in the creation form, auto-suggested from `name` when omitted (design.md - "Slug generation & validation"). */
  slug?: string;
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
    if (!input.name || input.name.trim().length === 0) {
      throw new InvalidVenueError("name is required");
    }

    const organization = await this.organizations.findById(input.tenantId);
    if (!organization) {
      throw new ParentOrganizationNotFoundError();
    }

    const slug = input.slug?.trim() ? input.slug.trim() : slugify(input.name);
    if (!isValidSlug(slug)) {
      throw new InvalidVenueSlugError();
    }
    if (await this.venues.findBySlug(input.tenantId, slug)) {
      throw new VenueSlugAlreadyExistsError();
    }

    return this.venues.create({ id: randomUUID(), tenantId: input.tenantId, name: input.name, slug });
  }
}
