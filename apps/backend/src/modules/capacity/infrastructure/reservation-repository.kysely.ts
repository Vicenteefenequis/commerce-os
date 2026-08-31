import { sql } from "kysely";
import type { Trx } from "../../../http/tx-route.js";
import { Reservation, type ReservationStatus } from "../domain/reservation.entity.js";
import type { CreateReservationInput, ReservationRepositoryPort } from "../domain/ports.js";

export class KyselyReservationRepository implements ReservationRepositoryPort {
  constructor(private readonly trx: Trx) {}

  async create(input: CreateReservationInput): Promise<Reservation> {
    const row = await this.trx
      .insertInto("reservations")
      .values({
        id: input.id,
        tenant_id: input.tenantId,
        resource_id: input.resourceId,
        period: input.period,
        amount: input.amount,
        status: "pending",
        commitment_id: input.commitmentId,
        expires_at: input.expiresAt,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    return this.toDomain(row);
  }

  async findById(tenantId: string, id: string): Promise<Reservation | null> {
    const row = await this.trx
      .selectFrom("reservations")
      .selectAll()
      .where("tenant_id", "=", tenantId)
      .where("id", "=", id)
      .executeTakeFirst();
    return row ? this.toDomain(row) : null;
  }

  /**
   * design.md D2: a single guarded UPDATE is Postgres's own atomicity -
   * only one of two racing transitions can match the `status IN (...)`
   * predicate and update the row.
   */
  async transitionStatus(
    tenantId: string,
    id: string,
    from: ReservationStatus | ReservationStatus[],
    to: ReservationStatus,
  ): Promise<boolean> {
    const fromStatuses = Array.isArray(from) ? from : [from];
    const result = await this.trx
      .updateTable("reservations")
      .set({ status: to, updated_at: sql`now()` })
      .where("tenant_id", "=", tenantId)
      .where("id", "=", id)
      .where("status", "in", fromStatuses)
      .executeTakeFirst();
    return Number(result.numUpdatedRows) > 0;
  }

  private toDomain(row: {
    id: string;
    tenant_id: string;
    resource_id: string;
    period: string;
    amount: number;
    status: ReservationStatus;
    commitment_id: string;
    expires_at: Date;
  }): Reservation {
    return Reservation.create({
      id: row.id,
      tenantId: row.tenant_id,
      resourceId: row.resource_id,
      period: row.period,
      amount: row.amount,
      status: row.status,
      commitmentId: row.commitment_id,
      expiresAt: row.expires_at,
    });
  }
}
