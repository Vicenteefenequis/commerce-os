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

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; customer?: string; status?: string }>;
}) {
  const filters = await searchParams;
  const query = new URLSearchParams();
  if (filters.id) query.set("id", filters.id);
  if (filters.customer) query.set("customer", filters.customer);
  if (filters.status) query.set("status", filters.status);
  const queryString = query.toString();

  const response = await backendFetch(`/orders${queryString ? `?${queryString}` : ""}`);
  const body = response.ok ? await response.json() : { orders: [] };
  const orders: OrderSummary[] = body.orders ?? [];

  return (
    <ToastProvider>
      <AdminNav />
      <main className="mx-auto max-w-4xl p-8">
        <OrdersContent orders={orders} filters={filters} />
      </main>
    </ToastProvider>
  );
}
