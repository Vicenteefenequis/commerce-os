import Image from "next/image";
import { backendUrl } from "@/lib/backend-url";
import { StoreIcon } from "@/components/icons/store-icon";
import { CheckoutCart, type StorefrontProduct, type VariantAvailability } from "./checkout-cart";
import { VenueProfile, type Offer } from "./venue-profile";
import { todayIsoDate } from "./date";
import { formatCents, offerDateParts } from "./format";

interface ProductsResponse {
  tenantId: string;
  venueId: string;
  venueName?: string;
  organizationName?: string | null;
  products?: StorefrontProduct[];
}

interface VenueProfileResponse {
  organizationName?: string | null;
  venueName: string;
  description: string | null;
  address: string | null;
  city: string | null;
  category: string | null;
  coverPhotoUrl: string | null;
  ageRestriction: number | null;
  activeOfferCount: number;
  remainingCapacity: number;
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
 * Merges the venue's showcase profile (spec: storefront/showcase) with
 * ticket selection (spec: storefront/checkout) on one screen - no
 * navigation between "browsing" and "buying" (proposal.md - "What
 * Changes"). Reachable regardless of the venue's `published` flag, same
 * as the showcase page it absorbs.
 *
 * Addressed by tenant/venue slug (add-storefront-tenant-landing): the
 * product-listing response carries the resolved tenant/venue UUIDs, so
 * they're sourced from there rather than from the route params -
 * `checkout-cart`/`actions.ts` still deal in UUIDs downstream.
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

  const [productsResponse, profileResponse] = await Promise.all([
    fetch(backendUrl(`/storefront/tenants/${tenantSlug}/venues/${venueSlug}/products`), {
      cache: "no-store",
    }),
    fetch(backendUrl(`/storefront/tenants/${tenantSlug}/venues/${venueSlug}/profile`), {
      cache: "no-store",
    }),
  ]);

  if (!productsResponse.ok || !profileResponse.ok) {
    return (
      <main className="mx-auto max-w-2xl p-8">
        <p className="text-sm text-sf-danger">Loja não encontrada.</p>
      </main>
    );
  }

  const productsBody: ProductsResponse = await productsResponse.json();
  const profile: VenueProfileResponse = await profileResponse.json();
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

  const offers: Offer[] = [...products]
    .sort((a, b) => {
      const aTime = a.availableFrom ? new Date(a.availableFrom).getTime() : Infinity;
      const bTime = b.availableFrom ? new Date(b.availableFrom).getTime() : Infinity;
      return aTime - bTime;
    })
    .map((product) => {
      const date = product.availableFrom ? new Date(product.availableFrom) : new Date();
      const lowestPriceCents = Math.min(...product.variants.map((variant) => variant.priceCents));
      return {
        id: product.id,
        name: product.name,
        ...offerDateParts(date),
        price: formatCents(lowestPriceCents),
        capacityPercentFull: product.capacityPercentFull,
      };
    });

  return (
    <main className="mx-auto max-w-2xl p-8 pb-28">
      <div className="relative mb-6 aspect-video w-full overflow-hidden rounded-sf-lg bg-sf-bg-subtle">
        {profile.coverPhotoUrl ? (
          <Image src={profile.coverPhotoUrl} alt={profile.venueName} fill className="object-cover" unoptimized />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <StoreIcon className="h-12 w-12 text-sf-fg-muted" />
          </div>
        )}
      </div>

      <div className="mb-6">
        {profile.organizationName && (
          <p className="text-sm font-medium text-sf-fg-muted">{profile.organizationName}</p>
        )}
        <h1 className="text-2xl font-bold text-sf-fg">{profile.venueName}</h1>
      </div>

      <VenueProfile
        category={profile.category}
        city={profile.city}
        address={profile.address}
        description={profile.description}
        ageRestriction={profile.ageRestriction}
        activeOfferCount={profile.activeOfferCount}
        remainingCapacity={profile.remainingCapacity}
        offers={offers}
      >
        <CheckoutCart
          tenantId={tenantId}
          venueId={venueId}
          products={products}
          visitDate={visitDate}
          availability={availability}
        />
      </VenueProfile>
    </main>
  );
}
