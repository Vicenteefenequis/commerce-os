import { notFound } from "next/navigation";
import { AdminNav } from "@/components/layout/admin-nav";
import { ToastProvider } from "@/components/ui/toast";
import { backendFetch } from "@/lib/backend-fetch";
import { OrderDetailContent } from "./order-detail-content";

export interface OrderLine {
  id: string;
  variantId: string;
  name: string;
  /** Absent for a Gerente session (spec: commerce/order - "Gerente order retrieval omits monetary fields"). */
  unitPriceCents?: number;
  quantity: number;
  reservationId: string | null;
}

export interface OrderPayment {
  id: string;
  status: string;
  method: string;
  /** Absent for a Gerente session, same as OrderLine.unitPriceCents. */
  amountCents?: number;
  refundedAmountCents?: number;
}

export interface OrderDetail {
  id: string;
  venueId: string;
  status: string;
  /** Absent for a Gerente session, same as OrderLine.unitPriceCents. */
  totalCents?: number;
  lines: OrderLine[];
  payment: OrderPayment | null;
}

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const response = await backendFetch(`/orders/${id}`);
  if (response.status === 404) notFound();
  if (!response.ok) notFound();
  const order: OrderDetail = await response.json();

  return (
    <ToastProvider>
      <AdminNav />
      <main className="mx-auto max-w-3xl p-8">
        <OrderDetailContent order={order} />
      </main>
    </ToastProvider>
  );
}
