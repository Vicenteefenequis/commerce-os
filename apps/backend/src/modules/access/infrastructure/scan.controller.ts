import type { Request } from "express";
import type { Trx, TxResult } from "../../../http/tx-route.js";
import { KyselyOrderRepository } from "../../commerce/infrastructure/order-repository.kysely.js";
import { KyselyEntitlementRepository } from "../../ticketing/infrastructure/entitlement-repository.kysely.js";
import { KyselyTicketRepository } from "../../ticketing/infrastructure/ticket-repository.kysely.js";
import { KyselyVenueRepository } from "../../venue/infrastructure/venue-repository.kysely.js";
import { ScanTicketUseCase, UnknownScanVenueError } from "../application/scan-ticket.usecase.js";
import { KyselyReservationPeriodLookup } from "./reservation-period-lookup.kysely.js";
import { KyselyScanAttemptRepository } from "./scan-attempt-repository.kysely.js";

/**
 * POST /access/scan (spec: access/scan). Every one of the six outcomes -
 * denials included - is a successfully classified scan, so all of them
 * answer 200 with the outcome in the body: the scanner shows the operator
 * what happened, and an HTTP error is reserved for a request that could
 * not be evaluated at all (no session Venue, no code).
 *
 * The whole scan runs inside the route's single transaction (txRoute), so
 * the Entitlement's consumption and the ScanAttempt that records it commit
 * or roll back together.
 */
export async function scanTicketController(req: Request, trx: Trx): Promise<TxResult> {
  const identity = req.identity;
  if (!identity) return { status: 401, body: { error: "authentication required" } };

  const { code, venueId } = req.body as { code?: string; venueId?: string };

  // spec: "Scan is evaluated against an explicitly selected Venue" - the
  // Venue is checked first, before anything touches the Ticket.
  if (!venueId) return { status: 400, body: { error: "venueId is required" } };
  // An absent code is a malformed request, not a malformed code: there is
  // no scanned value to report an outcome about or to record.
  if (!code || code.trim().length === 0) return { status: 400, body: { error: "code is required" } };

  const useCase = new ScanTicketUseCase(
    new KyselyVenueRepository(trx),
    new KyselyTicketRepository(trx),
    new KyselyEntitlementRepository(trx),
    new KyselyOrderRepository(trx),
    new KyselyReservationPeriodLookup(trx),
    new KyselyScanAttemptRepository(trx),
  );

  try {
    const result = await useCase.execute({ tenantId: identity.tenantId, code, venueId });
    return {
      status: 200,
      body: {
        outcome: result.outcome,
        entitlementId: result.entitlementId,
        scannedAt: result.scannedAt.toISOString(),
      },
    };
  } catch (err) {
    if (err instanceof UnknownScanVenueError) return { status: 400, body: { error: err.message } };
    throw err;
  }
}
