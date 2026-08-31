import { sql } from "kysely";
import type { Trx } from "../../../http/tx-route.js";
import type { ReservationPeriodLookupPort } from "../domain/ports.js";

export class KyselyReservationPeriodLookup implements ReservationPeriodLookupPort {
  constructor(private readonly trx: Trx) {}

  /**
   * `reservations.period` is a Postgres `date`; the pg driver materializes
   * a bare `date` as a JS `Date` at the *client's* local midnight, which
   * would silently smuggle a timezone into the comparison the scan makes.
   * Reading it as text keeps the value the calendar date it actually is
   * and leaves the start/end derivation to `classifyScanTime`, where it is
   * explicit and unit-testable.
   */
  async findPeriodByReservationId(tenantId: string, reservationId: string): Promise<string | null> {
    const row = await this.trx
      .selectFrom("reservations")
      .select(sql<string>`to_char(period, 'YYYY-MM-DD')`.as("period"))
      .where("tenant_id", "=", tenantId)
      .where("id", "=", reservationId)
      .executeTakeFirst();
    return row?.period ?? null;
  }
}
