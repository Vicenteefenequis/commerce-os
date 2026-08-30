import { randomUUID } from "node:crypto";
import type { Kysely } from "kysely";
import type { Database } from "../../../db/schema.js";
import type { Trx } from "../../../http/tx-route.js";
import { Session } from "../domain/session.entity.js";
import type { SessionRepositoryPort } from "../domain/ports.js";

function toSession(row: {
  id: string;
  tenant_id: string;
  user_id: string;
  expires_at: Date | string;
  revoked_at: Date | string | null;
}): Session {
  return Session.create({
    id: row.id,
    tenantId: row.tenant_id,
    userId: row.user_id,
    expiresAt: new Date(row.expires_at),
    revokedAt: row.revoked_at ? new Date(row.revoked_at) : null,
  });
}

export class KyselySessionRepository implements SessionRepositoryPort {
  constructor(private readonly trx: Trx) {}

  async create(session: {
    tenantId: string;
    userId: string;
    expiresAt: Date;
  }): Promise<Session> {
    const row = await this.trx
      .insertInto("sessions")
      .values({
        id: randomUUID(),
        tenant_id: session.tenantId,
        user_id: session.userId,
        expires_at: session.expiresAt,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    return toSession(row);
  }

  async findById(sessionId: string): Promise<Session | null> {
    const row = await this.trx
      .selectFrom("sessions")
      .selectAll()
      .where("id", "=", sessionId)
      .executeTakeFirst();
    return row ? toSession(row) : null;
  }

  async revoke(sessionId: string): Promise<void> {
    await this.trx
      .updateTable("sessions")
      .set({ revoked_at: new Date() })
      .where("id", "=", sessionId)
      .execute();
  }
}

/**
 * Session lookup used by the auth-resolution middleware, BEFORE the
 * request's tenant is known - the session id itself is what tells us the
 * tenant. Runs against the plain db handle (no app.tenant_id set); this is
 * safe because the sessions_select_by_id RLS policy intentionally allows
 * SELECT regardless of tenant (design.md D4 / migrations 1700000006000).
 */
export async function findSessionByIdUnscoped(
  db: Kysely<Database>,
  sessionId: string,
): Promise<Session | null> {
  const row = await db
    .selectFrom("sessions")
    .selectAll()
    .where("id", "=", sessionId)
    .executeTakeFirst();
  return row ? toSession(row) : null;
}
