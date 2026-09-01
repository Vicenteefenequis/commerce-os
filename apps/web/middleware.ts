import { NextResponse, type NextRequest } from "next/server";
import { backendUrl } from "@/lib/backend-url";

/**
 * Runs on the Edge runtime, so it cannot use `backendFetch()` (which relies
 * on `next/headers`, only available in Server Components/Actions/Route
 * Handlers) - it forwards the request's Cookie header directly instead.
 */
export async function middleware(request: NextRequest) {
  const cookie = request.headers.get("cookie");
  const response = await fetch(backendUrl("/auth/me"), {
    headers: cookie ? { cookie } : undefined,
    cache: "no-store",
  });
  const isAuthenticated = response.ok;

  if (request.nextUrl.pathname === "/admin/login") {
    return isAuthenticated
      ? NextResponse.redirect(new URL("/admin/dashboard", request.url))
      : NextResponse.next();
  }

  return isAuthenticated
    ? NextResponse.next()
    : NextResponse.redirect(new URL("/admin/login", request.url));
}

export const config = {
  matcher: ["/admin/login", "/admin/dashboard", "/admin/venues", "/admin/products", "/admin/resources", "/admin/scan"],
};
