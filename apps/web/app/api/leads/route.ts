import { NextResponse } from "next/server";
import { backendUrl } from "../../../lib/backend-url";

// Route Handlers act as the BFF (design.md D2): they call the backend
// directly. No cookies to forward - lead submission is public.
export async function POST(req: Request) {
  const body = await req.text();
  const response = await fetch(backendUrl("/leads"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
  const responseBody = await response.json();
  return NextResponse.json(responseBody, { status: response.status });
}
