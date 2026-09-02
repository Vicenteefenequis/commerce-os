import { parse, serialize } from "cookie";
import type { Request } from "express";
import { env } from "../../../config/env.js";

export function platformSessionCookieHeader(sessionId: string): string {
  return serialize(env.platformSessionCookieName, sessionId, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: env.sessionTtlSeconds,
  });
}

export function clearedPlatformSessionCookieHeader(): string {
  return serialize(env.platformSessionCookieName, "", {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export function readPlatformSessionCookie(req: Request): string | null {
  const header = req.headers.cookie;
  if (!header) return null;
  const cookies = parse(header);
  return cookies[env.platformSessionCookieName] ?? null;
}
