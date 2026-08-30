import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { backendUrl } from "./backend-url";

/** Forwards the httpOnly session cookie to the backend (design.md D7) - the browser never talks to the backend directly. */
export async function backendFetch(path: string, init?: RequestInit): Promise<Response> {
  const cookieStore = await cookies();
  const headers = new Headers(init?.headers);
  headers.set("cookie", cookieStore.toString());
  if (init?.body !== undefined && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  return fetch(backendUrl(path), { ...init, headers, cache: "no-store" });
}

/** Mirrors a backend Response (status, body, Set-Cookie) onto a Next.js route response. */
export async function proxyResponse(response: Response): Promise<NextResponse> {
  const setCookie = response.headers.get("set-cookie");
  const proxied =
    response.status === 204
      ? new NextResponse(null, { status: 204 })
      : NextResponse.json(await response.json(), { status: response.status });
  if (setCookie) proxied.headers.set("set-cookie", setCookie);
  return proxied;
}

/** Applies a backend response's Set-Cookie header to the current request's cookie jar (Server Actions/Route Handlers only). */
export async function applySetCookie(response: Response): Promise<void> {
  const setCookie = response.headers.get("set-cookie");
  if (!setCookie) return;

  const [pair, ...attrs] = setCookie.split(";").map((part) => part.trim());
  const separatorIndex = pair.indexOf("=");
  const name = pair.slice(0, separatorIndex);
  const value = pair.slice(separatorIndex + 1);

  const options: {
    path?: string;
    maxAge?: number;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: "lax" | "strict" | "none";
  } = {};
  for (const attr of attrs) {
    const [rawKey, rawValue] = attr.split("=");
    switch (rawKey.trim().toLowerCase()) {
      case "path":
        options.path = rawValue;
        break;
      case "max-age":
        options.maxAge = Number(rawValue);
        break;
      case "httponly":
        options.httpOnly = true;
        break;
      case "secure":
        options.secure = true;
        break;
      case "samesite":
        options.sameSite = rawValue?.trim().toLowerCase() as "lax" | "strict" | "none";
        break;
    }
  }

  const cookieStore = await cookies();
  cookieStore.set(name, value, options);
}
