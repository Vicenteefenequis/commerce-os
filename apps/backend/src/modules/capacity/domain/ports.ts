import type { Resource } from "./resource.entity.js";
import type { Reservation, ReservationStatus } from "./reservation.entity.js";

export interface CreateResourceInput {
  id: string;
  tenantId: string;
  venueId: string;
  name: string;
  defaultCapacity: number;
  hardCapacity?: boolean;
}

export interface ResourceRepositoryPort {
  create(input: CreateResourceInput): Promise<Resource>;
  findById(tenantId: string, id: string): Promise<Resource | null>;
  listByVenue(tenantId: string, venueId: string): Promise<Resource[]>;
  setDefaultCapacity(tenantId: string, id: string, capacity: number): Promise<void>;
}

export interface CapacityPeriodRepositoryPort {
  /** Configured capacity for a resource on a period: override if set, else the resource's default. */
  getConfiguredCapacity(tenantId: string, resourceId: string, period: string): Promise<number>;
  setPeriodCapacity(tenantId: string, resourceId: string, period: string, capacity: number): Promise<void>;
  /** Sum of amounts for commitments in `held`/`consumed` status for this resource+period. */
  getCommittedAmount(tenantId: string, resourceId: string, period: string): Promise<number>;
}

export type CommitmentStatus = "held" | "consumed" | "released";

export interface CapacityCommitmentRepositoryPort {
  /**
   * Locks the period row (design.md D3), checks configured capacity minus
   * already-committed amount, and inserts a new commitment only if
   * `amount` fits (when `hardCapacity` is true). Returns null when the
   * hard-capacity check rejects the commitment.
   */
  tryCommit(input: {
    tenantId: string;
    resourceId: string;
    period: string;
    amount: number;
    hardCapacity: boolean;
  }): Promise<{ id: string } | null>;

  /**
   * Releases a `held` commitment, freeing its capacity back to available
   * (spec: capacity/resource - "Commitment release frees capacity").
   * Guarded: only transitions rows currently `held`. Returns whether a
   * row was updated.
   */
  releaseCommitment(tenantId: string, id: string): Promise<boolean>;

  /**
   * Marks a `held` commitment consumed, permanently retaining its
   * capacity as committed (spec: capacity/resource - "Commitment
   * consumption is permanent"). Guarded: only transitions rows currently
   * `held`. Returns whether a row was updated.
   */
  markConsumed(tenantId: string, id: string): Promise<boolean>;
}

export interface CreateReservationInput {
  id: string;
  tenantId: string;
  resourceId: string;
  period: string;
  amount: number;
  commitmentId: string;
  expiresAt: Date;
}

export interface ReservationRepositoryPort {
  create(input: CreateReservationInput): Promise<Reservation>;
  findById(tenantId: string, id: string): Promise<Reservation | null>;
  /**
   * Guarded status transition (design.md D2): updates the row only if its
   * current status is one of `from`. Returns whether a row was updated -
   * false means the reservation was not in an expected status (already
   * transitioned, concurrently raced, or does not exist).
   */
  transitionStatus(
    tenantId: string,
    id: string,
    from: ReservationStatus | ReservationStatus[],
    to: ReservationStatus,
  ): Promise<boolean>;
}
