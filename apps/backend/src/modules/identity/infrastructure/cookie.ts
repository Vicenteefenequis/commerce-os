import { parse, serialize } from "cookie";
import type { Request } from "express";
import { env } from "../../../config/env.js";

export function sessionCookieHeader(sessionId: string): string {
  return serialize(env.sessionCookieName, sessionId, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: env.sessionTtlSeconds,
  });
}

export function clearedSessionCookieHeader(): string {
  return serialize(env.sessionCookieName, "", {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export function readSessionCookie(req: Request): string | null {
  const header = req.headers.cookie;
  if (!header) return null;
  const cookies = parse(header);
  return cookies[env.sessionCookieName] ?? null;
}
