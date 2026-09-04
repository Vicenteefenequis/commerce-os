import { randomBytes } from "node:crypto";

/**
 * Crockford's Base32 alphabet: digits 0-9 plus A-Z minus I, L, O, U -
 * chosen so no two characters can be confused when a person reads a
 * code off a screen and types it by hand (spec: access/scanner -
 * manual code entry is a supported fallback when a camera isn't
 * available, M9). 32 characters -> exactly 5 bits per character, and
 * 256 (a byte's range) divides evenly by 32, so mapping one random
 * byte to one character via modulo introduces no bias.
 */
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const CODE_LENGTH = 15; // 15 * 5 = 75 bits of entropy

/**
 * A short, high-entropy code suitable for a QR payload and for manual
 * typing (spec: ticketing/ticket - "Ticket carries a unique code").
 * Global uniqueness is enforced by the database's unique index on
 * `tickets.code`; 75 bits of entropy makes a collision practically
 * impossible.
 */
export function generateTicketCode(): string {
  const bytes = randomBytes(CODE_LENGTH);
  let code = "";
  for (const byte of bytes) {
    code += ALPHABET[byte % ALPHABET.length];
  }
  return code;
}
