"use server";

import { revalidatePath } from "next/cache";
import { backendFetch } from "@/lib/backend-fetch";

export interface CounterSaleOrder {
  id: string;
  status: string;
  channel: string;
  totalCents: number;
}

export interface CounterSalePayment {
  id: string;
  status: string;
  method: string;
  amountCents: number;
}

export interface CreateCounterSaleResult {
  error?: string;
  order?: CounterSaleOrder;
  payment?: CounterSalePayment;
}

/** spec: admin/counter-sale. Buyer is optional - omitted entirely when either field is blank, so the backend resolves the shared placeholder Customer. */
export async function createCounterSale(input: {
  venueId: string;
  variantId: string;
  quantity: number;
  period?: string;
  buyerEmail?: string;
  buyerName?: string;
}): Promise<CreateCounterSaleResult> {
  const hasBuyer = Boolean(input.buyerEmail?.trim() && input.buyerName?.trim());

  const response = await backendFetch("/counter-sales", {
    method: "POST",
    body: JSON.stringify({
      venueId: input.venueId,
      lines: [{ variantId: input.variantId, quantity: input.quantity, period: input.period || undefined }],
      ...(hasBuyer ? { customer: { email: input.buyerEmail, name: input.buyerName } } : {}),
    }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    return { error: body.error ?? "Falha ao registrar venda" };
  }

  revalidatePath("/admin/orders");
  revalidatePath("/admin/dashboard");
  return { order: body.order, payment: body.payment };
}

export interface OrderTicketSummary {
  id: string;
  code: string;
}

/** spec: ticketing/ticket - "Tickets for a paid Order can be listed account-less"; reused here through the authenticated session instead of a tenantId query param. */
export async function getOrderTickets(orderId: string): Promise<OrderTicketSummary[]> {
  const response = await backendFetch(`/orders/${orderId}/tickets`);
  if (!response.ok) return [];
  const body = await response.json();
  return body.tickets ?? [];
}
