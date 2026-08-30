import type { Resource } from "../domain/resource.entity.js";
import type { ResourceRepositoryPort } from "../domain/ports.js";

/** spec: capacity/resource - "Resource belongs to a single tenant". */
export class ListResourcesUseCase {
  constructor(private readonly resources: ResourceRepositoryPort) {}

  async execute(tenantId: string, venueId: string): Promise<Resource[]> {
    return this.resources.listByVenue(tenantId, venueId);
  }
}
