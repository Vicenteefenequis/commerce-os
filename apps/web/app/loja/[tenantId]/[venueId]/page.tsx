import { backendUrl } from "@/lib/backend-url";
import { CheckoutCart, type StorefrontProduct } from "./checkout-cart";

interface Venue {
  id: string;
  name: string;
}

/**
 * Public, account-less storefront (design.md - "Server-rendered where it
 * reads, client-rendered where it's interactive"). No session/cookie: the
 * catalog reads are all public (spec: storefront/catalog).
 */
export default async function StorefrontPage({
  params,
}: {
  params: Promise<{ tenantId: string; venueId: string }>;
}) {
  const { tenantId, venueId } = await params;

  const [venuesResponse, productsResponse] = await Promise.all([
    fetch(backendUrl(`/storefront/venues/${tenantId}`), { cache: "no-store" }),
    fetch(backendUrl(`/storefront/venues/${tenantId}/${venueId}/products`), { cache: "no-store" }),
  ]);

  if (!productsResponse.ok) {
    return (
      <main className="mx-auto max-w-2xl p-8">
        <p className="text-sm text-danger">Loja não encontrada.</p>
      </main>
    );
  }

  const venuesBody: { organizationName?: string | null; venues?: Venue[] } = venuesResponse.ok
    ? await venuesResponse.json()
    : {};
  const venue = venuesBody.venues?.find((v) => v.id === venueId);

  const productsBody: { products?: StorefrontProduct[] } = await productsResponse.json();
  const products = productsBody.products ?? [];

  return (
    <main className="mx-auto max-w-2xl p-8">
      <div className="mb-6">
        {venuesBody.organizationName && (
          <p className="text-sm font-medium text-fg-muted">{venuesBody.organizationName}</p>
        )}
        <h1 className="text-xl font-semibold text-fg">{venue?.name ?? "Loja"}</h1>
      </div>
      <CheckoutCart tenantId={tenantId} venueId={venueId} products={products} />
    </main>
  );
}
