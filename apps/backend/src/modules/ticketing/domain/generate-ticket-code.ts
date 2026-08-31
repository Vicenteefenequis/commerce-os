import { randomBytes } from "node:crypto";

/**
 * A short, URL-safe, high-entropy code suitable for a QR payload (spec:
 * ticketing/ticket - "Ticket carries a unique code"). Global uniqueness is
 * enforced by the database's unique index on `tickets.code`; this is
 * generated with enough entropy (72 bits) that a collision is
 * practically impossible.
 */
export function generateTicketCode(): string {
  return randomBytes(9).toString("base64url");
}
