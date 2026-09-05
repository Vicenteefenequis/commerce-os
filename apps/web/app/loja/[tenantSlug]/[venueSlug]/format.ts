/**
 * Plain helpers, not "use client" - shared by the Server Component
 * (page.tsx) and its client children (checkout-cart.tsx, venue-profile.tsx),
 * same reasoning as date.ts's `todayIsoDate`.
 */
export function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const WEEKDAY_FORMAT = new Intl.DateTimeFormat("pt-BR", { weekday: "short", timeZone: "UTC" });
const MONTH_FORMAT = new Intl.DateTimeFormat("pt-BR", { month: "short", timeZone: "UTC" });

export interface OfferDateParts {
  weekday: string;
  day: string;
  month: string;
}

/**
 * spec: storefront/showcase - "Ofertas tab lists each available product as a
 * dated offer". `date` is the Product's own `availableFrom` (design.md D1 -
 * each offer/Product carries its own specific date), falling back to now
 * when unset, same convention as the backend's `productPeriod`.
 */
export function offerDateParts(date: Date): OfferDateParts {
  return {
    weekday: WEEKDAY_FORMAT.format(date).replace(".", "").toUpperCase(),
    day: String(date.getUTCDate()).padStart(2, "0"),
    month: MONTH_FORMAT.format(date).replace(".", "").toUpperCase(),
  };
}
