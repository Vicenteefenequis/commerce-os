export type WhenFilter = "today" | "weekend" | string;

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

/**
 * spec: storefront/discovery - "Discovery search supports combinable facet
 * filters" ("when" value). Returns the calendar window a `when` filter
 * refers to, relative to `now`. `null` for "today" - it is already implied
 * by the unchanged point-in-time eligibility check, so no extra window
 * filtering is applied.
 */
export function windowForWhen(when: WhenFilter | undefined, now: Date): { start: Date; end: Date } | null {
  if (!when || when === "today") return null;

  if (when === "weekend") {
    const daysUntilSaturday = (6 - now.getDay() + 7) % 7;
    const saturday = startOfDay(addDays(now, daysUntilSaturday));
    const sunday = endOfDay(addDays(saturday, 1));
    return { start: saturday, end: sunday };
  }

  const date = new Date(when);
  return { start: startOfDay(date), end: endOfDay(date) };
}

/** Whether a product's availability window overlaps the given [start, end] window. */
export function overlapsWindow(
  product: { availableFrom: Date | null; availableUntil: Date | null },
  window: { start: Date; end: Date },
): boolean {
  if (product.availableFrom && product.availableFrom.getTime() > window.end.getTime()) return false;
  if (product.availableUntil && product.availableUntil.getTime() < window.start.getTime()) return false;
  return true;
}
