import type { NextFunction, Request, Response } from "express";

/** Rejects requests without a resolved identity (spec: foundation/identity). */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.identity) {
    res.status(401).json({ error: "authentication required" });
    return;
  }
  next();
}
