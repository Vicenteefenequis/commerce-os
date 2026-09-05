import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { GetProductAggregateCapacityUseCase } from "./get-product-aggregate-capacity.usecase.js";
import type { CapacityPeriodRepositoryPort } from "../domain/ports.js";

class FakeCapacityPeriodRepository implements CapacityPeriodRepositoryPort {
  constructor(
    private readonly configured: Map<string, number>,
    private readonly committed: Map<string, number> = new Map(),
  ) {}

  async getConfiguredCapacity(_tenantId: string, resourceId: string): Promise<number> {
    return this.configured.get(resourceId) ?? 0;
  }
  async setPeriodCapacity(): Promise<void> {
    throw new Error("not used in this test");
  }
  async getCommittedAmount(_tenantId: string, resourceId: string): Promise<number> {
    return this.committed.get(resourceId) ?? 0;
  }
}

describe("GetProductAggregateCapacityUseCase", () => {
  const tenantId = randomUUID();
  const period = "2026-09-19";

  it("returns null when the product has no resource-backed variants (spec: storefront/catalog - Product without resource-backed variants omits the capacity figure)", async () => {
    const repo = new FakeCapacityPeriodRepository(new Map());
    const result = await new GetProductAggregateCapacityUseCase(repo).execute(tenantId, [], period);
    expect(result).toBeNull();
  });

  it("sums configured/available capacity across every resource-backed variant (spec: storefront/catalog - Product with resource-backed variants includes an aggregate capacity figure)", async () => {
    const resourceA = randomUUID();
    const resourceB = randomUUID();
    const repo = new FakeCapacityPeriodRepository(
      new Map([
        [resourceA, 100],
        [resourceB, 50],
      ]),
      new Map([
        [resourceA, 80],
        [resourceB, 10],
      ]),
    );

    const result = await new GetProductAggregateCapacityUseCase(repo).execute(
      tenantId,
      [resourceA, resourceB],
      period,
    );

    expect(result).toEqual({ configuredCapacity: 150, availableCapacity: 60, percentFull: 60 });
  });

  it("reports zero percent full when nothing is configured, without dividing by zero", async () => {
    const repo = new FakeCapacityPeriodRepository(new Map());
    const resourceId = randomUUID();

    const result = await new GetProductAggregateCapacityUseCase(repo).execute(
      tenantId,
      [resourceId],
      period,
    );

    expect(result).toEqual({ configuredCapacity: 0, availableCapacity: 0, percentFull: 0 });
  });
});
