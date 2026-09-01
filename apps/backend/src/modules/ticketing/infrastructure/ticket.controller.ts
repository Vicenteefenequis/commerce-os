import type { Request } from "express";
import type { Trx, TxResult } from "../../../http/tx-route.js";
import { ListOrderTicketsUseCase } from "../application/list-order-tickets.usecase.js";
import { renderTicketQrCodePng } from "./render-ticket-qrcode.js";
import { KyselyEntitlementRepository } from "./entitlement-repository.kysely.js";
import { KyselyTicketRepository } from "./ticket-repository.kysely.js";
import type { Ticket } from "../domain/ticket.entity.js";

function serializeTicket(ticket: Ticket) {
  return { id: ticket.id, code: ticket.code };
}

/**
 * Public, no requireAuth (spec: ticketing/ticket - "Tickets for a paid
 * Order can be listed account-less"), same posture as
 * commerce/checkout and payments: tenantId comes from an authenticated
 * identity when present, else the request, and RLS is the actual
 * isolation boundary - a wrong tenantId or an unpaid/unknown Order id
 * simply resolves to an empty list.
 */
export async function listOrderTicketsController(req: Request, trx: Trx): Promise<TxResult> {
  const { orderId } = req.params as { orderId: string };
  const identity = req.identity;
  const tenantId = identity?.tenantId ?? ((req.query as { tenantId?: string })?.tenantId ?? "");

  if (!tenantId) return { status: 400, body: { error: "tenantId is required" } };

  const useCase = new ListOrderTicketsUseCase(new KyselyEntitlementRepository(trx), new KyselyTicketRepository(trx));
  const tickets = await useCase.execute({ tenantId, orderId });
  return { status: 200, body: { tickets: tickets.map(serializeTicket) } };
}

/**
 * Public, no requireAuth - same account-less posture as the list route
 * above (spec: ticketing/ticket - "Ticket code can be rendered as a QR
 * image"). Serves the QR image bytes directly so the storefront ticket
 * view can point an <img> straight at this route.
 */
export async function getTicketQrCodeController(req: Request, trx: Trx): Promise<TxResult> {
  const { ticketId } = req.params as { ticketId: string };
  const identity = req.identity;
  const tenantId = identity?.tenantId ?? ((req.query as { tenantId?: string })?.tenantId ?? "");

  if (!tenantId) return { status: 400, body: { error: "tenantId is required" } };

  const ticket = await new KyselyTicketRepository(trx).findById(tenantId, ticketId);
  if (!ticket) return { status: 404, body: { error: "ticket not found" } };

  const png = await renderTicketQrCodePng(ticket.code);
  return { status: 200, headers: { "content-type": "image/png" }, body: png };
}
