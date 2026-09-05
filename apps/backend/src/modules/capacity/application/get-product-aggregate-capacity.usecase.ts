import { calculateAvailableCapacity } from "../domain/available-capacity.js";
import type { CapacityPeriodRepositoryPort } from "../domain/ports.js";

export interface ProductAggregateCapacity {
  configuredCapacity: number;
  availableCapacity: number;
  /** Rounded percentage of configured capacity currently committed, 0-100. */
  percentFull: number;
}

/**
 * spec: storefront/catalog - "Product with resource-backed variants includes
 * an aggregate capacity figure" (add-tenant-profile-offers design.md D3).
 * Sums configured/available capacity across every resource-backed variant of
 * a Product for a given period, reusing `capacity/resource`'s calculation
 * per resource rather than introducing new capacity math.
 */
export class GetProductAggregateCapacityUseCase {
  constructor(private readonly periods: CapacityPeriodRepositoryPort) {}

  async execute(
    tenantId: string,
    resourceIds: string[],
    period: string,
  ): Promise<ProductAggregateCapacity | null> {
    if (resourceIds.length === 0) return null;

    const perResource = await Promise.all(
      resourceIds.map(async (resourceId) => {
        const [configured, committed] = await Promise.all([
          this.periods.getConfiguredCapacity(tenantId, resourceId, period),
          this.periods.getCommittedAmount(tenantId, resourceId, period),
        ]);
        return { configured, available: calculateAvailableCapacity(configured, committed) };
      }),
    );

    const configuredCapacity = perResource.reduce((sum, r) => sum + r.configured, 0);
    const availableCapacity = perResource.reduce((sum, r) => sum + r.available, 0);
    const percentFull =
      configuredCapacity > 0
        ? Math.round(((configuredCapacity - availableCapacity) / configuredCapacity) * 100)
        : 0;

    return { configuredCapacity, availableCapacity, percentFull };
  }
}
