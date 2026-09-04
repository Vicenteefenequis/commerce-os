import Image from "next/image";
import Link from "next/link";
import { backendUrl } from "@/lib/backend-url";
import { StoreIcon } from "@/components/icons/store-icon";

interface VenueProfileResponse {
  tenantSlug: string;
  organizationName?: string | null;
  venueSlug: string;
  venueName: string;
  description: string | null;
  address: string | null;
  city: string | null;
  category: string | null;
  coverPhotoUrl: string | null;
}

/**
 * Public, account-less venue showcase (spec: storefront/showcase).
 * Presentation-only: the "Comprar ingressos" CTA is the sole link into
 * the existing purchase flow at /loja/[tenantSlug]/[venueSlug]. Reachable
 * by direct link regardless of the Venue's `published` flag - only
 * inclusion in /busca search results depends on that.
 */
export default async function VitrinePage({
  params,
}: {
  params: Promise<{ tenantSlug: string; venueSlug: string }>;
}) {
  const { tenantSlug, venueSlug } = await params;

  const response = await fetch(
    backendUrl(`/storefront/tenants/${tenantSlug}/venues/${venueSlug}/profile`),
    { cache: "no-store" },
  );

  if (!response.ok) {
    return (
      <main className="mx-auto max-w-2xl p-8">
        <p className="text-sm text-danger">Unidade não encontrada.</p>
      </main>
    );
  }

  const venue: VenueProfileResponse = await response.json();

  return (
    <main className="mx-auto max-w-2xl p-8">
      <div className="relative mb-6 aspect-video w-full overflow-hidden rounded-lg bg-bg-subtle">
        {venue.coverPhotoUrl ? (
          <Image src={venue.coverPhotoUrl} alt={venue.venueName} fill className="object-cover" unoptimized />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <StoreIcon className="h-12 w-12 text-fg-muted" />
          </div>
        )}
      </div>

      {venue.organizationName && (
        <p className="text-sm font-medium text-fg-muted">{venue.organizationName}</p>
      )}
      <h1 className="text-2xl font-semibold text-fg">{venue.venueName}</h1>

      {venue.category && <p className="mt-1 text-sm text-fg-muted">{venue.category}</p>}

      {(venue.city || venue.address) && (
        <p className="mt-2 text-sm text-fg-muted">
          {[venue.address, venue.city].filter(Boolean).join(", ")}
        </p>
      )}

      {venue.description && <p className="mt-4 text-sm text-fg">{venue.description}</p>}

      <Link
        href={`/loja/${tenantSlug}/${venueSlug}`}
        className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-fg-on-primary hover:bg-primary-hover"
      >
        Comprar ingressos
      </Link>
    </main>
  );
}
