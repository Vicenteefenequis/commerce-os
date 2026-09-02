import { randomUUID } from "node:crypto";
import type { EventPublisherPort } from "../../../shared-kernel/ports.js";
import { isValidSlug, slugify } from "../../../shared-kernel/slug.js";
import { InvalidOrganizationError, Organization } from "../domain/organization.entity.js";
import { organizationCreatedEvent } from "../domain/events.js";
import type { OrganizationRepositoryPort } from "../domain/ports.js";

export interface CreateOrganizationInput {
  name: string;
  /** Editable in the creation form, auto-suggested from `name` when omitted (design.md - "Slug generation & validation"). */
  slug?: string;
}

export class InvalidSlugError extends Error {
  constructor() {
    super("slug must be lowercase letters, numbers, and single hyphens");
  }
}

export class SlugAlreadyExistsError extends Error {
  constructor() {
    super("an organization with this slug already exists");
  }
}

/** ORG-001: creates a new Organization (tenant). */
export class CreateOrganizationUseCase {
  constructor(
    private readonly organizations: OrganizationRepositoryPort,
    private readonly eventPublisher: EventPublisherPort,
  ) {}

  async execute(input: CreateOrganizationInput): Promise<Organization> {
    if (!input.name || input.name.trim().length === 0) {
      throw new InvalidOrganizationError("name is required");
    }

    const slug = input.slug?.trim() ? input.slug.trim() : slugify(input.name);
    if (!isValidSlug(slug)) {
      throw new InvalidSlugError();
    }
    if (await this.organizations.findBySlug(slug)) {
      throw new SlugAlreadyExistsError();
    }

    const id = randomUUID();
    const organization = Organization.create({ id, name: input.name, slug });

    const persisted = await this.organizations.create({
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
    });

    await this.eventPublisher.publish([
      organizationCreatedEvent(persisted.id, {
        organizationId: persisted.id,
        name: persisted.name,
      }),
    ]);

    return persisted;
  }
}
