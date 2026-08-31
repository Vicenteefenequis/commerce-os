"use server";

import { revalidatePath } from "next/cache";
import { backendFetch } from "@/lib/backend-fetch";

export interface OrderActionResult {
  error?: string;
}

export async function cancelOrder(orderId: string): Promise<OrderActionResult> {
  const response = await backendFetch(`/orders/${orderId}/cancel`, { method: "POST" });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    return { error: body.error ?? "Falha ao cancelar pedido" };
  }

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
  return {};
}

export async function fulfillOrder(orderId: string): Promise<OrderActionResult> {
  const response = await backendFetch(`/orders/${orderId}/fulfill`, { method: "POST" });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    return { error: body.error ?? "Falha ao concluir pedido" };
  }

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
  return {};
}

export async function refundPayment(
  orderId: string,
  paymentId: string,
  amountCents: number,
): Promise<OrderActionResult> {
  const response = await backendFetch(`/payments/${paymentId}/refund`, {
    method: "POST",
    body: JSON.stringify({ amountCents }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    return { error: body.error ?? "Falha ao reembolsar pagamento" };
  }

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
  return {};
}
