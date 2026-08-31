import { AdminNav } from "@/components/layout/admin-nav";
import { ToastProvider } from "@/components/ui/toast";
import { backendFetch } from "@/lib/backend-fetch";
import { OrdersContent } from "./orders-content";

export interface OrderSummary {
  id: string;
  venueId: string;
  status: string;
  totalCents: number;
}

export default async function OrdersPage() {
  const response = await backendFetch("/orders");
  const body = response.ok ? await response.json() : { orders: [] };
  const orders: OrderSummary[] = body.orders ?? [];

  return (
    <ToastProvider>
      <AdminNav />
      <main className="mx-auto max-w-4xl p-8">
        <OrdersContent orders={orders} />
      </main>
    </ToastProvider>
  );
}
