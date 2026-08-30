import { redirect } from "next/navigation";
import { AdminNav } from "@/components/layout/admin-nav";
import { ToastProvider } from "@/components/ui/toast";
import { backendFetch } from "@/lib/backend-fetch";
import { ProductsContent } from "./products-content";

interface Venue {
  id: string;
  name: string;
}

interface Variant {
  id: string;
  name: string;
  priceCents: number;
}

interface Product {
  id: string;
  venueId: string;
  name: string;
  availableFrom: string | null;
  availableUntil: string | null;
  channels: string[];
  variants: Variant[];
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ venueId?: string }>;
}) {
  const { venueId: requestedVenueId } = await searchParams;

  const venuesResponse = await backendFetch("/venues");
  if (venuesResponse.status === 401) redirect("/login");
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
      <main className="mx-auto max-w-4xl p-8">
        <ProductsContent key={venueId ?? "none"} venues={venues} venueId={venueId} products={products} />
      </main>
    </ToastProvider>
  );
}
