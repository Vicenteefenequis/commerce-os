import { backendUrl } from "@/lib/backend-url";
import { CheckoutCart, type StorefrontProduct, type VariantAvailability } from "./checkout-cart";
import { todayIsoDate } from "./date";

interface ProductsResponse {
  tenantId: string;
  venueId: string;
  venueName?: string;
  organizationName?: string | null;
  products?: StorefrontProduct[];
}

interface AvailabilityResponse {
  variantId: string;
  constrained: boolean;
  availableCapacity: number | null;
}

async function fetchAvailability(
  tenantSlug: string,
  venueSlug: string,
  variantId: string,
  date: string,
): Promise<VariantAvailability | undefined> {
  const response = await fetch(
    backendUrl(
      `/storefront/tenants/${tenantSlug}/venues/${venueSlug}/variants/${variantId}/availability?period=${encodeURIComponent(date)}`,
    ),
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
 * Addressed by tenant/venue slug (add-storefront-tenant-landing): the
 * product-listing response carries the resolved tenant/venue UUIDs, so
 * they're sourced from there rather than from the route params -
 * `checkout-cart`/`actions.ts` still deal in UUIDs for `POST /checkout`
 * and everything downstream.
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
  params: Promise<{ tenantSlug: string; venueSlug: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const { tenantSlug, venueSlug } = await params;
  const { date } = await searchParams;
  const visitDate = date ?? todayIsoDate();

  const productsResponse = await fetch(
    backendUrl(`/storefront/tenants/${tenantSlug}/venues/${venueSlug}/products`),
    { cache: "no-store" },
  );

  if (!productsResponse.ok) {
    return (
      <main className="mx-auto max-w-2xl p-8">
        <p className="text-sm text-danger">Loja não encontrada.</p>
      </main>
    );
  }

  const productsBody: ProductsResponse = await productsResponse.json();
  const products = productsBody.products ?? [];
  const { tenantId, venueId } = productsBody;

  const constrainedVariantIds = products.flatMap((product) =>
    product.variants.filter((variant) => variant.resourceId).map((variant) => variant.id),
  );
  const availabilityEntries = await Promise.all(
    constrainedVariantIds.map(async (variantId) => {
      const availability = await fetchAvailability(tenantSlug, venueSlug, variantId, visitDate);
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
        {productsBody.organizationName && (
          <p className="text-sm font-medium text-fg-muted">{productsBody.organizationName}</p>
        )}
        <h1 className="text-xl font-semibold text-fg">{productsBody.venueName ?? "Loja"}</h1>
      </div>
      <CheckoutCart
        tenantId={tenantId}
        venueId={venueId}
        products={products}
        visitDate={visitDate}
        availability={availability}
      />
    </main>
  );
}
