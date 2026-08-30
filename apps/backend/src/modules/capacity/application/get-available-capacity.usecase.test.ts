import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { GetAvailableCapacityUseCase } from "./get-available-capacity.usecase.js";
import type { CapacityPeriodRepositoryPort } from "../domain/ports.js";

class FakeCapacityPeriodRepository implements CapacityPeriodRepositoryPort {
  constructor(
    private readonly defaultCapacity: number,
    private readonly overrides: Map<string, number> = new Map(),
    private readonly committed: Map<string, number> = new Map(),
  ) {}

  async getConfiguredCapacity(_tenantId: string, _resourceId: string, period: string): Promise<number> {
    return this.overrides.get(period) ?? this.defaultCapacity;
  }
  async setPeriodCapacity(_tenantId: string, _resourceId: string, period: string, capacity: number): Promise<void> {
    this.overrides.set(period, capacity);
  }
  async getCommittedAmount(_tenantId: string, _resourceId: string, period: string): Promise<number> {
    return this.committed.get(period) ?? 0;
  }
}

describe("GetAvailableCapacityUseCase", () => {
  const tenantId = randomUUID();
  const resourceId = randomUUID();

  it("uses the period override instead of the default capacity (spec: capacity/resource - Period override takes precedence)", async () => {
    const overrides = new Map([["2026-06-15", 50]]);
    const repo = new FakeCapacityPeriodRepository(100, overrides);

    expect(await new GetAvailableCapacityUseCase(repo).execute(tenantId, resourceId, "2026-06-15")).toBe(50);
    expect(await new GetAvailableCapacityUseCase(repo).execute(tenantId, resourceId, "2026-06-16")).toBe(100);
  });

  it("subtracts committed capacity from the configured capacity for that period", async () => {
    const committed = new Map([["2026-06-15", 30]]);
    const repo = new FakeCapacityPeriodRepository(100, new Map(), committed);

    expect(await new GetAvailableCapacityUseCase(repo).execute(tenantId, resourceId, "2026-06-15")).toBe(70);
  });
});
