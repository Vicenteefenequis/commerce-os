import { randomUUID } from "node:crypto";
import type { EventPublisherPort } from "../../../shared-kernel/ports.js";
import { Organization } from "../domain/organization.entity.js";
import { organizationCreatedEvent } from "../domain/events.js";
import type { OrganizationRepositoryPort } from "../domain/ports.js";

export interface CreateOrganizationInput {
  name: string;
}

/** ORG-001: creates a new Organization (tenant). */
export class CreateOrganizationUseCase {
  constructor(
    private readonly organizations: OrganizationRepositoryPort,
    private readonly eventPublisher: EventPublisherPort,
  ) {}

  async execute(input: CreateOrganizationInput): Promise<Organization> {
    const id = randomUUID();
    const organization = Organization.create({ id, name: input.name });

    const persisted = await this.organizations.create({
      id: organization.id,
      name: organization.name,
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
