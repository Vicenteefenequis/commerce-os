import { calculateAvailableCapacity } from "../domain/available-capacity.js";
import type { CapacityPeriodRepositoryPort } from "../domain/ports.js";

/** spec: capacity/resource - "Available capacity calculation". */
export class GetAvailableCapacityUseCase {
  constructor(private readonly periods: CapacityPeriodRepositoryPort) {}

  async execute(tenantId: string, resourceId: string, period: string): Promise<number> {
    const [configured, committed] = await Promise.all([
      this.periods.getConfiguredCapacity(tenantId, resourceId, period),
      this.periods.getCommittedAmount(tenantId, resourceId, period),
    ]);
    return calculateAvailableCapacity(configured, committed);
  }
}
