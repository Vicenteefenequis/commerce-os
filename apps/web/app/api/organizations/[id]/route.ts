import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { backendUrl } from "../../../../lib/backend-url";

// Forwards the httpOnly session cookie to the backend (design.md D7) -
// the browser never talks to the backend directly.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cookieStore = await cookies();
  const response = await fetch(backendUrl(`/organizations/${id}`), {
    headers: { cookie: cookieStore.toString() },
  });
  const body = await response.json();
  return NextResponse.json(body, { status: response.status });
}
