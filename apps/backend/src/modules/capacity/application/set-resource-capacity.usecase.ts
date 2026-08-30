import type { EventPublisherPort } from "../../../shared-kernel/ports.js";
import { InvalidResourceError } from "../domain/resource.entity.js";
import { resourceCapacitySetEvent } from "../domain/events.js";
import type { CapacityPeriodRepositoryPort, ResourceRepositoryPort } from "../domain/ports.js";

export class ResourceNotFoundError extends Error {
  constructor() {
    super("resource not found");
  }
}

export interface SetResourceCapacityInput {
  tenantId: string;
  resourceId: string;
  /** ISO date (YYYY-MM-DD) for a period override, or omitted to change the default capacity. */
  period?: string;
  capacity: number;
  actorUserId: string;
}

/**
 * spec: capacity/resource - "Resource maximum capacity", "Capacity
 * varies by period". Setting the default is a Resource-level update;
 * setting a period is a row in resource_capacity_periods that overrides
 * it (spec scenario: "Period override takes precedence").
 */
export class SetResourceCapacityUseCase {
  constructor(
    private readonly resources: ResourceRepositoryPort,
    private readonly periods: CapacityPeriodRepositoryPort,
    private readonly eventPublisher: EventPublisherPort,
  ) {}

  async execute(input: SetResourceCapacityInput): Promise<void> {
    if (!Number.isInteger(input.capacity) || input.capacity < 0) {
      throw new InvalidResourceError("capacity must be a non-negative integer");
    }

    const resource = await this.resources.findById(input.tenantId, input.resourceId);
    if (!resource) {
      throw new ResourceNotFoundError();
    }

    if (input.period) {
      await this.periods.setPeriodCapacity(input.tenantId, input.resourceId, input.period, input.capacity);
    } else {
      await this.resources.setDefaultCapacity(input.tenantId, input.resourceId, input.capacity);
    }

    await this.eventPublisher.publish([
      resourceCapacitySetEvent(input.tenantId, {
        resourceId: input.resourceId,
        period: input.period ?? null,
        capacity: input.capacity,
        actorUserId: input.actorUserId,
      }),
    ]);
  }
}
