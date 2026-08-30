import { sql } from "kysely";
import { db } from "../db/kysely.js";
import { getOutboxConsumersFor } from "../events/outbox-consumer-registry.js";

const MAX_ROWS_PER_WAKE = 500;

/**
 * Drains pending outbox_events one row at a time, each in its own
 * transaction, using SELECT ... FOR UPDATE SKIP LOCKED so multiple worker
 * instances can run concurrently without double-processing (design.md D6).
 * Returns the number of events processed.
 */
export async function processPendingEvents(): Promise<number> {
  let processed = 0;

  for (let i = 0; i < MAX_ROWS_PER_WAKE; i++) {
    const processedId = await db.transaction().execute(async (trx) => {
      const pending = await trx
        .selectFrom("outbox_events")
        .selectAll()
        .where("processed_at", "is", null)
        .orderBy("created_at", "asc")
        .limit(1)
        .forUpdate()
        .skipLocked()
        .executeTakeFirst();

      if (!pending) return null;

      await sql`select set_config('app.tenant_id', ${pending.tenant_id}, true)`.execute(trx);

      const consumers = getOutboxConsumersFor(pending.event_type);
      for (const consumer of consumers) {
        await consumer(
          {
            id: pending.id,
            tenantId: pending.tenant_id,
            type: pending.event_type,
            payload: pending.payload,
          },
          trx,
        );
      }

      await trx
        .updateTable("outbox_events")
        .set({ processed_at: new Date() })
        .where("id", "=", pending.id)
        .execute();

      return pending.id;
    });

    if (!processedId) break;
    processed++;
  }

  return processed;
}
