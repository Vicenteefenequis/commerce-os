import Image from "next/image";
import Link from "next/link";
import { backendUrl } from "@/lib/backend-url";
import { StoreIcon } from "@/components/icons/store-icon";
import { SearchFilters } from "./search-filters";

interface DiscoverableVenue {
  tenantSlug: string;
  organizationName: string;
  venueSlug: string;
  venueName: string;
  category: string | null;
  city: string | null;
  coverPhotoUrl: string | null;
}

/**
 * Public, account-less cross-tenant venue search (spec:
 * storefront/discovery). City/category filters live in the URL so this
 * Server Component can fetch on every change (nextjs-frontend-conventions).
 */
export default async function BuscaPage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string; category?: string }>;
}) {
  const { city = "", category = "" } = await searchParams;

  const query = new URLSearchParams();
  if (city) query.set("city", city);
  if (category) query.set("category", category);

  const response = await fetch(backendUrl(`/storefront/discovery/venues?${query.toString()}`), {
    cache: "no-store",
  });
  const body = response.ok ? await response.json() : { venues: [] };
  const venues: DiscoverableVenue[] = body.venues ?? [];

  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="text-2xl font-semibold text-fg">Encontre onde comprar ingressos</h1>

      <div className="mt-6">
        <SearchFilters city={city} category={category} />
      </div>

      {venues.length === 0 ? (
        <p className="mt-8 text-sm text-fg-muted">Nenhum estabelecimento encontrado.</p>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {venues.map((venue) => (
            <Link
              key={`${venue.tenantSlug}-${venue.venueSlug}`}
              href={`/vitrine/${venue.tenantSlug}/${venue.venueSlug}`}
              className="overflow-hidden rounded-lg border border-border bg-surface transition-colors hover:border-border-strong"
            >
              <div className="relative aspect-video w-full bg-bg-subtle">
                {venue.coverPhotoUrl ? (
                  <Image
                    src={venue.coverPhotoUrl}
                    alt={venue.venueName}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <StoreIcon className="h-10 w-10 text-fg-muted" />
                  </div>
                )}
              </div>
              <div className="p-4">
                <p className="text-xs font-medium text-fg-muted">{venue.organizationName}</p>
                <h2 className="text-base font-semibold text-fg">{venue.venueName}</h2>
                <p className="mt-1 text-sm text-fg-muted">
                  {[venue.category, venue.city].filter(Boolean).join(" · ")}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
