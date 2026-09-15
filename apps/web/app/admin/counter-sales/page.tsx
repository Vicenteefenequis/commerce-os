import { redirect } from "next/navigation";
import { AdminNav } from "@/components/layout/admin-nav";
import { ToastProvider } from "@/components/ui/toast";
import { backendFetch } from "@/lib/backend-fetch";
import { CounterSaleContent } from "./counter-sale-content";

interface Venue {
  id: string;
  name: string;
}

interface Variant {
  id: string;
  name: string;
  priceCents: number;
  resourceId: string | null;
}

interface Product {
  id: string;
  name: string;
  variants: Variant[];
}

/**
 * spec: admin/counter-sale. Lets a staff member register a walk-in sale
 * (venue -> product -> lote -> quantity, optional buyer) directly from
 * the dashboard, completing it as a paid Order backed by a cash Payment
 * in one step.
 */
export default async function CounterSalesPage({
  searchParams,
}: {
  searchParams: Promise<{ venueId?: string }>;
}) {
  const { venueId: requestedVenueId } = await searchParams;

  const venuesResponse = await backendFetch("/venues");
  if (venuesResponse.status === 401) redirect("/admin/login");
  const venuesBody = venuesResponse.ok ? await venuesResponse.json() : { venues: [] };
  const venues: Venue[] = venuesBody.venues ?? [];

  const venueId = requestedVenueId ?? venues[0]?.id;

  let products: Product[] = [];
  if (venueId) {
    const productsResponse = await backendFetch(`/products?venueId=${venueId}`);
    if (productsResponse.ok) {
      const productsBody = await productsResponse.json();
      products = productsBody.products ?? [];
    }
  }

  return (
    <ToastProvider>
      <AdminNav />
      <main className="mx-auto max-w-2xl p-4 sm:p-8">
        <CounterSaleContent key={venueId ?? "none"} venues={venues} venueId={venueId} products={products} />
      </main>
    </ToastProvider>
  );
}
