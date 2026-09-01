"use server";

import { backendFetch } from "@/lib/backend-fetch";
import type { ScanOutcome } from "./scan-content";

export interface ScanTicketResult {
  outcome?: ScanOutcome;
  error?: string;
}

/**
 * spec: access/scanner - Server Action per admin/data-fetching (mutations
 * never go through a client-side fetch to a route handler). Forwards the
 * operator's session cookie so `POST /access/scan`'s `entitlement:consume`
 * check is enforced server-side regardless of what the UI allows.
 */
export async function scanTicket(input: { code: string; venueId: string }): Promise<ScanTicketResult> {
  const response = await backendFetch("/access/scan", {
    method: "POST",
    body: JSON.stringify({ code: input.code, venueId: input.venueId }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    return { error: body.error ?? "Não foi possível processar o scan" };
  }
  return { outcome: body.outcome as ScanOutcome };
}
