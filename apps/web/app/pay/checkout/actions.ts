"use server";

import { backendUrl } from "@/lib/backend-url";
import type { CartLine } from "./cart-payload";

export interface CreateOrderInput {
  tenantId: string;
  venueId: string;
  lines: CartLine[];
  customer: { email: string; name: string };
}

export interface CreateOrderResult {
  orderId?: string;
  error?: string;
}

/**
 * Write (creates + submits an Order) - Server Action per
 * nextjs-frontend-conventions. Guest customer, no session to forward:
 * tenantId travels in the body, same as the payment page's actions.ts.
 *
 * spec: storefront/checkout - "Storefront checkout hands off to the
 * existing payment page"; payments/payment - "Payment page collects buyer
 * identification before payment". The Order (and its Customer) is created
 * here, only once both the cart selection and buyer details are known -
 * not at cart-submit time (design.md - "Order creation moves to the
 * payment step").
 */
export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  const checkoutResponse = await fetch(backendUrl("/checkout"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      tenantId: input.tenantId,
      venueId: input.venueId,
      lines: input.lines,
      customer: input.customer,
    }),
    cache: "no-store",
  });
  const checkoutBody = await checkoutResponse.json().catch(() => ({}));
  if (!checkoutResponse.ok) {
    return { error: checkoutBody.error ?? "Não foi possível concluir a compra" };
  }

  const orderId: string = checkoutBody.id;
  const submitResponse = await fetch(backendUrl(`/orders/${orderId}/submit-for-payment`), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ tenantId: input.tenantId }),
    cache: "no-store",
  });
  const submitBody = await submitResponse.json().catch(() => ({}));
  if (!submitResponse.ok) {
    return { error: submitBody.error ?? "Não foi possível enviar o pedido para pagamento" };
  }

  return { orderId };
}
