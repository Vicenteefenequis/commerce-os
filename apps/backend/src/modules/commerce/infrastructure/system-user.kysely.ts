import { randomUUID } from "node:crypto";
import type { Trx } from "../../../http/tx-route.js";

/**
 * Guest checkout (CHK-001) has no authenticated actor, but every audited
 * event (RESERVATION_CREATED, ORDER_CREATED, ...) needs a real `users` row
 * for `audit_log.actor_user_id` (NOT NULL, FK to `users`). Rather than
 * relax that constraint - a behavior change to foundation/audit outside
 * this change's declared capabilities - each tenant gets one reserved
 * "system" user, created lazily on first use, that guest-initiated
 * actions are attributed to. It can never log in (no route reads this
 * email, and its password_hash is not a real Argon2 hash).
 */
const CHECKOUT_SYSTEM_USER_EMAIL = "checkout-system@internal.local";

export async function ensureCheckoutSystemUserId(trx: Trx, tenantId: string): Promise<string> {
  const existing = await trx
    .selectFrom("users")
    .select("id")
    .where("tenant_id", "=", tenantId)
    .where("email", "=", CHECKOUT_SYSTEM_USER_EMAIL)
    .executeTakeFirst();
  if (existing) return existing.id;

  const inserted = await trx
    .insertInto("users")
    .values({
      id: randomUUID(),
      tenant_id: tenantId,
      email: CHECKOUT_SYSTEM_USER_EMAIL,
      password_hash: `disabled:${randomUUID()}`,
    })
    .onConflict((oc) => oc.columns(["tenant_id", "email"]).doNothing())
    .returning("id")
    .executeTakeFirst();
  if (inserted) return inserted.id;

  // Lost a race with a concurrent checkout creating the same row - read it back.
  const row = await trx
    .selectFrom("users")
    .select("id")
    .where("tenant_id", "=", tenantId)
    .where("email", "=", CHECKOUT_SYSTEM_USER_EMAIL)
    .executeTakeFirstOrThrow();
  return row.id;
}
