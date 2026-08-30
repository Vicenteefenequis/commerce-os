import { randomUUID } from "node:crypto";
import type { VenueRepositoryPort } from "../../venue/domain/ports.js";
import type { EventPublisherPort } from "../../../shared-kernel/ports.js";
import { Resource } from "../domain/resource.entity.js";
import { resourceCreatedEvent } from "../domain/events.js";
import type { ResourceRepositoryPort } from "../domain/ports.js";

export class ParentVenueNotFoundError extends Error {
  constructor() {
    super("parent venue does not exist");
  }
}

export interface CreateResourceInput {
  tenantId: string;
  venueId: string;
  name: string;
  defaultCapacity: number;
  hardCapacity?: boolean;
  actorUserId: string;
}

/** spec: capacity/resource - "Resource creation under a venue". */
export class CreateResourceUseCase {
  constructor(
    private readonly venues: VenueRepositoryPort,
    private readonly resources: ResourceRepositoryPort,
    private readonly eventPublisher: EventPublisherPort,
  ) {}

  async execute(input: CreateResourceInput): Promise<Resource> {
    const venues = await this.venues.listByTenant(input.tenantId);
    const venue = venues.find((v) => v.id === input.venueId);
    if (!venue) {
      throw new ParentVenueNotFoundError();
    }

    // Validate via the domain entity first (fail fast with InvalidResourceError).
    Resource.create({
      id: randomUUID(),
      tenantId: input.tenantId,
      venueId: input.venueId,
      name: input.name,
      defaultCapacity: input.defaultCapacity,
      hardCapacity: input.hardCapacity ?? false,
    });

    const resource = await this.resources.create({
      id: randomUUID(),
      tenantId: input.tenantId,
      venueId: input.venueId,
      name: input.name,
      defaultCapacity: input.defaultCapacity,
      hardCapacity: input.hardCapacity ?? false,
    });

    await this.eventPublisher.publish([
      resourceCreatedEvent(input.tenantId, {
        resourceId: resource.id,
        venueId: resource.venueId,
        name: resource.name,
        defaultCapacity: resource.defaultCapacity,
        actorUserId: input.actorUserId,
      }),
    ]);

    return resource;
  }
}
