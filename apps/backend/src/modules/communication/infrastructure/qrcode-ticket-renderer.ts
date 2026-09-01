import { renderTicketQrCodePng } from "../../ticketing/infrastructure/render-ticket-qrcode.js";
import type { QrCodeRendererPort } from "../domain/ports.js";

/** Adapts ticketing's QR rendering (spec: ticketing/ticket) for use by ticket delivery emails. */
export class QrCodeTicketRenderer implements QrCodeRendererPort {
  render(code: string): Promise<Buffer> {
    return renderTicketQrCodePng(code);
  }
}
