export class InvalidScanPeriodError extends Error {}

export type ScanTimePosition = "before" | "within" | "after";

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * The instants a Reservation's `period` covers. `reservations.period` is a
 * Postgres `date` - a calendar day carrying neither a time of day nor a
 * zone (migration 1700000013000_reservations.cjs) - and the system models
 * no timezone of its own anywhere, so a period means that whole calendar
 * day as the server reckons it: `start` is its local midnight and `end`
 * the next day's local midnight, exclusive.
 */
export function reservationPeriodBounds(period: string): { start: Date; end: Date } {
  const match = ISO_DATE.exec(period);
  if (!match) throw new InvalidScanPeriodError(`period must be an ISO calendar date, got "${period}"`);

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  return {
    start: new Date(year, month - 1, day, 0, 0, 0, 0),
    end: new Date(year, month - 1, day + 1, 0, 0, 0, 0),
  };
}

/**
 * spec: access/scan - "Wrong time and expired are detected only for
 * Reservation-backed Entitlements". Pure so both directions
 * (before -> wrong time, after -> expired; add-access-control design.md
 * D4) can be proven without a clock or a database.
 */
export function classifyScanTime(now: Date, period: string): ScanTimePosition {
  const { start, end } = reservationPeriodBounds(period);
  if (now.getTime() < start.getTime()) return "before";
  if (now.getTime() >= end.getTime()) return "after";
  return "within";
}
