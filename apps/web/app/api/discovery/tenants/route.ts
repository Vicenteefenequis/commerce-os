import { NextResponse } from "next/server";
import { backendUrl } from "../../../../lib/backend-url";

const PASSTHROUGH_PARAMS = ["q", "category", "when", "availability", "maxPriceCents", "lat", "lng"];

// Public, no cookie - the discovery grid has no session (spec:
// storefront/discovery). Still proxied through this Route Handler rather
// than called from the browser directly, to keep the
// browser-never-talks-to-backend-directly boundary (design.md D7).
export async function GET(req: Request) {
  const incoming = new URL(req.url).searchParams;
  const params = new URLSearchParams();
  for (const key of PASSTHROUGH_PARAMS) {
    const value = incoming.get(key);
    if (value !== null && value !== "") params.set(key, value);
  }

  const response = await fetch(backendUrl(`/storefront/discovery/tenants?${params.toString()}`), {
    cache: "no-store",
  });
  const body = await response.json();
  return NextResponse.json(body, { status: response.status });
}
