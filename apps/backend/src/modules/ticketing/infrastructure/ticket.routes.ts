import { Router } from "express";
import { txRouteWithTenant } from "../../../http/tx-route.js";
import { getTicketQrCodeController, listOrderTicketsController } from "./ticket.controller.js";

export const ticketRouter = Router();

/**
 * Public, no requireAuth (spec: ticketing/ticket - "Tickets for a paid
 * Order can be listed account-less"), same pattern as
 * commerce/checkout.routes.ts and payment.routes.ts: tenantId comes
 * from an authenticated identity when present, else the query string
 * (GET has no body).
 */
ticketRouter.get(
  "/orders/:orderId/tickets",
  txRouteWithTenant(
    (req) => req.identity?.tenantId ?? ((req.query as { tenantId?: string })?.tenantId ?? ""),
    listOrderTicketsController,
  ),
);

ticketRouter.get(
  "/tickets/:ticketId/qrcode",
  txRouteWithTenant(
    (req) => req.identity?.tenantId ?? ((req.query as { tenantId?: string })?.tenantId ?? ""),
    getTicketQrCodeController,
  ),
);
