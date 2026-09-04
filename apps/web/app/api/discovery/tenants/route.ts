import { NextResponse } from "next/server";
import { backendUrl } from "../../../../lib/backend-url";

// Public, no cookie - the landing page's tenant search has no session
// (spec: storefront/discovery). Still proxied through this Route Handler
// rather than called from the browser directly, to keep the
// browser-never-talks-to-backend-directly boundary (design.md D7).
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  const response = await fetch(backendUrl(`/storefront/discovery/tenants?q=${encodeURIComponent(q)}`), {
    cache: "no-store",
  });
  const body = await response.json();
  return NextResponse.json(body, { status: response.status });
}
