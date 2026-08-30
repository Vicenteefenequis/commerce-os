import { InvalidResourceError } from "../domain/resource.entity.js";
import type { CapacityCommitmentRepositoryPort, ResourceRepositoryPort } from "../domain/ports.js";

export class ResourceNotFoundError extends Error {
  constructor() {
    super("resource not found");
  }
}

export class CapacityExceededError extends Error {
  constructor() {
    super("commitment exceeds available capacity");
  }
}

export interface CommitCapacityInput {
  tenantId: string;
  resourceId: string;
  period: string;
  amount: number;
}

/**
 * spec: capacity/resource - "Hard capacity overbooking prevention",
 * "Concurrent commitments do not exceed hard capacity". No production
 * caller exists yet in this change (design.md Non-Goals) - Reservation
 * will call this once specified. Exists now so the capacity ledger and
 * its concurrency guarantees can be built and tested against something
 * real.
 */
export class CommitCapacityUseCase {
  constructor(
    private readonly resources: ResourceRepositoryPort,
    private readonly commitments: CapacityCommitmentRepositoryPort,
  ) {}

  async execute(input: CommitCapacityInput): Promise<{ id: string }> {
    if (!Number.isInteger(input.amount) || input.amount <= 0) {
      throw new InvalidResourceError("amount must be a positive integer");
    }

    const resource = await this.resources.findById(input.tenantId, input.resourceId);
    if (!resource) {
      throw new ResourceNotFoundError();
    }

    const commitment = await this.commitments.tryCommit({
      tenantId: input.tenantId,
      resourceId: input.resourceId,
      period: input.period,
      amount: input.amount,
      hardCapacity: resource.hardCapacity,
    });

    if (!commitment) {
      throw new CapacityExceededError();
    }

    return commitment;
  }
}
