import { NextResponse } from "next/server";
import { backendUrl } from "../../../lib/backend-url";

// Route Handlers act as the BFF (design.md D2): they call the backend
// directly, no separate BFF service.
export async function GET() {
  const response = await fetch(backendUrl("/health"));
  const body = await response.json();
  return NextResponse.json(body, { status: response.status });
}
