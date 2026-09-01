import { NextResponse } from "next/server";
import { backendUrl } from "../../../../../lib/backend-url";

// Public, no cookie forwarded - same account-less posture as
// /api/payments/[id]/status (spec: ticketing/ticket - "Tickets for a
// paid Order can be listed account-less"). Proxied through this Route
// Handler because it's consumed by the client-driven post-payment
// screen on /pay/[orderId] (design.md - same exception the payment
// status route already establishes), not by a Server Component or
// Server Action.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tenantId = new URL(req.url).searchParams.get("tenantId") ?? "";
  const response = await fetch(backendUrl(`/orders/${id}/tickets?tenantId=${encodeURIComponent(tenantId)}`), {
    cache: "no-store",
  });
  const body = await response.json();
  return NextResponse.json(body, { status: response.status });
}
