"use server";

import { backendFetch } from "@/lib/backend-fetch";

export interface CreatePaymentIntentResult {
  clientSecret?: string;
  paymentId?: string;
  error?: string;
}

/**
 * Write (creates a Payment) - Server Action per nextjs-frontend-conventions.
 * No session to forward (guest customer): tenantId travels in the body,
 * same as commerce/checkout's own account-less design.
 */
export async function createPaymentIntent(
  orderId: string,
  tenantId: string,
  method: "card" | "pix",
): Promise<CreatePaymentIntentResult> {
  const response = await backendFetch(`/orders/${orderId}/payment-intent`, {
    method: "POST",
    body: JSON.stringify({ tenantId, method }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    return { error: body.error ?? "Não foi possível iniciar o pagamento" };
  }
  return { clientSecret: body.clientSecret, paymentId: body.id };
}
