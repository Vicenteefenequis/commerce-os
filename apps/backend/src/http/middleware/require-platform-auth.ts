import type { NextFunction, Request, Response } from "express";
import "../platform-identity.js";

/** Rejects requests without a resolved platform identity (spec: foundation/platform-admin). */
export function requirePlatformAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.platformIdentity) {
    res.status(401).json({ error: "platform authentication required" });
    return;
  }
  next();
}
