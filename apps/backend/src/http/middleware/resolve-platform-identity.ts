import type { NextFunction, Request, Response } from "express";
import { db } from "../../db/kysely.js";
import { readPlatformSessionCookie } from "../../modules/platform/infrastructure/cookie.js";
import { findPlatformSessionByIdUnscoped } from "../../modules/platform/infrastructure/platform-session-repository.kysely.js";
import "../platform-identity.js";

/**
 * Resolves the platform session cookie (if any) into req.platformIdentity.
 * Runs on every request, independent of resolveIdentity (tenant) - a
 * request can carry both a tenant session and a platform session at once.
 */
export async function resolvePlatformIdentity(req: Request, _res: Response, next: NextFunction) {
  try {
    const sessionId = readPlatformSessionCookie(req);
    if (!sessionId) {
      return next();
    }

    const session = await findPlatformSessionByIdUnscoped(db, sessionId);
    if (!session || !session.isValid(new Date())) {
      return next();
    }

    req.platformIdentity = { adminId: session.adminId };
    next();
  } catch (err) {
    next(err);
  }
}
