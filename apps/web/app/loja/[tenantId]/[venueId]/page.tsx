import { backendUrl } from "@/lib/backend-url";
import { CheckoutCart, todayIsoDate, type StorefrontProduct, type VariantAvailability } from "./checkout-cart";

interface Venue {
  id: string;
  name: string;
}

interface AvailabilityResponse {
  variantId: string;
  constrained: boolean;
  availableCapacity: number | null;
}

async function fetchAvailability(
  tenantId: string,
  variantId: string,
  date: string,
): Promise<VariantAvailability | undefined> {
  const response = await fetch(
    backendUrl(`/storefront/variants/${tenantId}/${variantId}/availability?period=${encodeURIComponent(date)}`),
    { cache: "no-store" },
  );
  if (!response.ok) return undefined;
  const body: AvailabilityResponse = await response.json();
  return { constrained: body.constrained, availableCapacity: body.availableCapacity };
}

/**
 * Public, account-less storefront (design.md - "Server-rendered where it
 * reads, client-rendered where it's interactive"). No session/cookie: the
 * catalog reads are all public (spec: storefront/catalog).
 *
 * The visit date lives in the URL, not client state (design.md - M12.3):
 * it now drives a server-fetched read (availability), so it follows
 * nextjs-frontend-conventions's rule for a per-user selection that changes
 * what the page shows.
 */
export default async function StorefrontPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantId: string; venueId: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const { tenantId, venueId } = await params;
  const { date } = await searchParams;
  const visitDate = date ?? todayIsoDate();

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

  const constrainedVariantIds = products.flatMap((product) =>
    product.variants.filter((variant) => variant.resourceId).map((variant) => variant.id),
  );
  const availabilityEntries = await Promise.all(
    constrainedVariantIds.map(async (variantId) => {
      const availability = await fetchAvailability(tenantId, variantId, visitDate);
      return [variantId, availability] as const;
    }),
  );
  const availability: Record<string, VariantAvailability> = {};
  for (const [variantId, entry] of availabilityEntries) {
    if (entry) availability[variantId] = entry;
  }

  return (
    <main className="mx-auto max-w-2xl p-8">
      <div className="mb-6">
        {venuesBody.organizationName && (
          <p className="text-sm font-medium text-fg-muted">{venuesBody.organizationName}</p>
        )}
        <h1 className="text-xl font-semibold text-fg">{venue?.name ?? "Loja"}</h1>
      </div>
      <CheckoutCart tenantId={tenantId} venueId={venueId} products={products} visitDate={visitDate} availability={availability} />
    </main>
  );
}
