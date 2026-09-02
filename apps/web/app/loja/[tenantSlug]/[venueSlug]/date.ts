/**
 * Plain helper, not "use client": needed by the Server Component
 * (page.tsx) as a default when no `?date=` is in the URL, and re-exported
 * by checkout-cart.tsx for its own client-side default. A function
 * exported from a "use client" module can't be called from a Server
 * Component (Next.js turns it into a client reference), so it lives here
 * instead of in checkout-cart.tsx.
 */
export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}
