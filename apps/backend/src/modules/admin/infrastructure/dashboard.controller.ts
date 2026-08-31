import type { Request } from "express";
import type { Trx, TxResult } from "../../../http/tx-route.js";
import { GetDashboardSummaryUseCase } from "../application/get-dashboard-summary.usecase.js";
import { KyselyDashboardSummaryRepository } from "./dashboard-summary-repository.kysely.js";

function serializeSummary(summary: Awaited<ReturnType<GetDashboardSummaryUseCase["execute"]>>) {
  return {
    sales: summary.sales,
    orders: summary.orders,
    visitors: summary.visitors,
  };
}

/** spec: admin/dashboard - "Dashboard summary is scoped by tenant, venue, and period". */
export async function getDashboardSummaryController(req: Request, trx: Trx): Promise<TxResult> {
  const identity = req.identity;
  if (!identity) return { status: 401, body: { error: "authentication required" } };

  const { venueId, from, to } = req.query as { venueId?: string; from?: string; to?: string };
  if (!from || !to) return { status: 400, body: { error: "from and to are required" } };

  const fromDate = new Date(from);
  const toDate = new Date(to);
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    return { status: 400, body: { error: "from and to must be valid dates" } };
  }

  const summary = await new GetDashboardSummaryUseCase(new KyselyDashboardSummaryRepository(trx)).execute({
    tenantId: identity.tenantId,
    ...(venueId ? { venueId } : {}),
    from: fromDate,
    to: toDate,
  });

  return { status: 200, body: serializeSummary(summary) };
}
