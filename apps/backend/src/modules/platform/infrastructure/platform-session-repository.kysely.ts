import { randomUUID } from "node:crypto";
import type { Kysely } from "kysely";
import type { Database } from "../../../db/schema.js";
import type { Trx } from "../../../http/tx-route.js";
import { PlatformSession } from "../domain/platform-session.entity.js";
import type { PlatformSessionRepositoryPort } from "../domain/ports.js";

function toPlatformSession(row: {
  id: string;
  admin_id: string;
  expires_at: Date | string;
  revoked_at: Date | string | null;
}): PlatformSession {
  return PlatformSession.create({
    id: row.id,
    adminId: row.admin_id,
    expiresAt: new Date(row.expires_at),
    revokedAt: row.revoked_at ? new Date(row.revoked_at) : null,
  });
}

export class KyselyPlatformSessionRepository implements PlatformSessionRepositoryPort {
  constructor(private readonly trx: Trx) {}

  async create(session: { adminId: string; expiresAt: Date }): Promise<PlatformSession> {
    const row = await this.trx
      .insertInto("platform_sessions")
      .values({
        id: randomUUID(),
        admin_id: session.adminId,
        expires_at: session.expiresAt,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    return toPlatformSession(row);
  }

  async findById(sessionId: string): Promise<PlatformSession | null> {
    const row = await this.trx
      .selectFrom("platform_sessions")
      .selectAll()
      .where("id", "=", sessionId)
      .executeTakeFirst();
    return row ? toPlatformSession(row) : null;
  }

  async revoke(sessionId: string): Promise<void> {
    await this.trx
      .updateTable("platform_sessions")
      .set({ revoked_at: new Date() })
      .where("id", "=", sessionId)
      .execute();
  }
}

/**
 * Session lookup used by the platform auth-resolution middleware. Unlike
 * the tenant sessions table, platform_sessions has no RLS at all (no
 * tenant to scope by), so this simply runs against the plain db handle.
 */
export async function findPlatformSessionByIdUnscoped(
  db: Kysely<Database>,
  sessionId: string,
): Promise<PlatformSession | null> {
  const row = await db
    .selectFrom("platform_sessions")
    .selectAll()
    .where("id", "=", sessionId)
    .executeTakeFirst();
  return row ? toPlatformSession(row) : null;
}
