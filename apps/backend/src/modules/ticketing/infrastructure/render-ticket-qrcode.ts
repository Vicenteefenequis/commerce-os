import QRCode from "qrcode";

/**
 * spec: ticketing/ticket - "Ticket code can be rendered as a QR image".
 * Encodes only the given code as the QR payload - no Entitlement,
 * Order, or authorization data is embedded, matching "Ticket code
 * references the Entitlement, not an authorization decision".
 */
export async function renderTicketQrCodePng(code: string): Promise<Buffer> {
  return QRCode.toBuffer(code, { type: "png", margin: 1 });
}
