import { NextResponse } from "next/server";
import { backendUrl } from "../../../../../lib/backend-url";

// Public, no cookie forwarded - the payment page has no session for a
// guest customer (spec: payments/payment - "Payment status can be
// checked without an authenticated session"). Still proxied through
// this Route Handler rather than called from the browser directly, to
// keep the browser-never-talks-to-backend-directly boundary (design.md D7)
// even though this particular backend route needs no auth.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tenantId = new URL(req.url).searchParams.get("tenantId") ?? "";
  const response = await fetch(
    backendUrl(`/payments/${id}/status?tenantId=${encodeURIComponent(tenantId)}`),
    { cache: "no-store" },
  );
  const body = await response.json();
  return NextResponse.json(body, { status: response.status });
}
