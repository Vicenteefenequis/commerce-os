"use server";

import { backendUrl } from "@/lib/backend-url";

export interface CheckoutLineInput {
  variantId: string;
  quantity: number;
  period?: string;
}

export interface SubmitCheckoutInput {
  tenantId: string;
  venueId: string;
  lines: CheckoutLineInput[];
  customer: { email: string; name: string };
}

export interface SubmitCheckoutResult {
  orderId?: string;
  error?: string;
}

/**
 * Write (creates + submits an Order) - Server Action per
 * nextjs-frontend-conventions. Guest customer, no session to forward:
 * tenantId travels in the body, same as the payment page's actions.ts.
 */
export async function submitCheckout(input: SubmitCheckoutInput): Promise<SubmitCheckoutResult> {
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
