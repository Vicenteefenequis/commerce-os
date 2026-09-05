import { sql } from "kysely";
import type { Trx } from "../../../http/tx-route.js";
import type { ReservationValidityLookupPort } from "../domain/ports.js";

/**
 * Reads `reservations.period` as text, same as access's
 * `KyselyReservationPeriodLookup` - a Postgres `date` materializes as a JS
 * `Date` at the client's local midnight, which would silently smuggle a
 * timezone into the caller's derivation of the validity window.
 */
export class KyselyReservationValidityLookup implements ReservationValidityLookupPort {
  constructor(private readonly trx: Trx) {}

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
