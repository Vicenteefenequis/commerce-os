export interface CartLine {
  variantId: string;
  quantity: number;
  period?: string;
}

export interface CartSummaryLine {
  name: string;
  quantity: number;
  priceCents: number;
}

/**
 * Carries a submitted cart from the storefront cart step
 * (`/loja/[tenantSlug]/[venueSlug]`) to the buyer-details step
 * (`/pay/checkout`) via the URL, without creating an Order yet (design.md
 * - "Order creation moves to the payment step"). `summary`/`totalCents`
 * are carried alongside `lines` so the buyer-details step can show the
 * real total immediately, without an extra fetch.
 */
export interface CartPayload {
  tenantId: string;
  venueId: string;
  lines: CartLine[];
  summary: CartSummaryLine[];
  totalCents: number;
}
