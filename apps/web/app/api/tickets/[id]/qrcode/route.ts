import { NextResponse } from "next/server";
import { backendUrl } from "../../../../../lib/backend-url";

// Public, no cookie forwarded - same account-less posture as
// /api/payments/[id]/status (spec: ticketing/ticket - "Ticket code can
// be rendered as a QR image"). Reachable directly by a browser <img>
// tag, which is outside the React tree entirely, so this route (not a
// Server Action) is the right channel (design.md).
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tenantId = new URL(req.url).searchParams.get("tenantId") ?? "";
  const response = await fetch(backendUrl(`/tickets/${id}/qrcode?tenantId=${encodeURIComponent(tenantId)}`), {
    cache: "no-store",
  });

  if (!response.ok) {
    return new NextResponse(null, { status: response.status });
  }

  const png = await response.arrayBuffer();
  return new NextResponse(png, {
    status: 200,
    headers: { "content-type": response.headers.get("content-type") ?? "image/png" },
  });
}
