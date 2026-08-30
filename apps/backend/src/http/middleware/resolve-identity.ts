import type { NextFunction, Request, Response } from "express";
import { sql } from "kysely";
import { db } from "../../db/kysely.js";
import { readSessionCookie } from "../../modules/identity/infrastructure/cookie.js";
import { findSessionByIdUnscoped } from "../../modules/identity/infrastructure/session-repository.kysely.js";
import { KyselyRoleAssignmentRepository } from "../../modules/authorization/infrastructure/role-assignment-repository.kysely.js";
import type { Identity } from "../identity.js";

/**
 * Resolves the session cookie (if any) into req.identity, including roles.
 * Runs on every request. Absence of req.identity means "unauthenticated" -
 * routes that require auth check for it explicitly (see requireAuth).
 *
 * Two short queries are used deliberately: the session lookup runs
 * unscoped (session id is the credential - see session-repository.kysely.ts),
 * then a small tenant-scoped transaction resolves roles once the tenant is
 * known, so role_assignments' RLS policy (tenant-only) is still honored.
 */
export async function resolveIdentity(req: Request, _res: Response, next: NextFunction) {
  try {
    const sessionId = readSessionCookie(req);
    if (!sessionId) {
      return next();
    }

    const session = await findSessionByIdUnscoped(db, sessionId);
    if (!session || !session.isValid(new Date())) {
      return next();
    }

    const roles = await db.transaction().execute(async (trx) => {
      await sql`select set_config('app.tenant_id', ${session.tenantId}, true)`.execute(trx);
      return new KyselyRoleAssignmentRepository(trx).findRolesForUser(
        session.tenantId,
        session.userId,
      );
    });

    const identity: Identity = { userId: session.userId, tenantId: session.tenantId, roles };
    req.identity = identity;
    next();
  } catch (err) {
    next(err);
  }
}
