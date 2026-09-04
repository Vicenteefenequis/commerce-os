import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { backendUrl } from "@/lib/backend-url";
import { Card, CardHeader } from "@/components/ui/card";
import { StoreIcon } from "@/components/icons/store-icon";

interface Venue {
  id: string;
  slug: string;
  name: string;
  category: string | null;
  address: string | null;
  city: string | null;
  coverPhotoUrl: string | null;
}

/**
 * Public, account-less tenant storefront entry point (spec:
 * storefront/tenant-entry). Lands a shared tenant link, or a tenant search
 * result, somewhere: skips straight to the venue when there's only one,
 * otherwise lists venues (as photo/address/category cards) to pick from.
 */
export default async function TenantEntryPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;

  const venuesResponse = await fetch(backendUrl(`/storefront/tenants/${tenantSlug}/venues`), {
    cache: "no-store",
  });

  if (!venuesResponse.ok) {
    return (
      <main className="mx-auto max-w-2xl p-8">
        <Card>
          <CardHeader
            title="Loja não encontrada"
            description="Não encontramos nenhuma loja disponível neste link."
          />
        </Card>
      </main>
    );
  }

  const venuesBody: { organizationName?: string | null; venues?: Venue[] } = await venuesResponse.json();
  const venues = venuesBody.venues ?? [];
  const organizationName = venuesBody.organizationName;

  if (venues.length === 1) {
    redirect(`/loja/${tenantSlug}/${venues[0].slug}`);
  }

  if (venues.length === 0) {
    return (
      <main className="mx-auto max-w-2xl p-8">
        <Card>
          <CardHeader
            title={organizationName ?? "Loja"}
            description="Nenhum local disponível para compra no momento."
          />
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl p-8">
      <Card>
        <CardHeader
          title={organizationName ?? "Escolha onde comprar"}
          description="Escolha o local onde você quer comprar seu ingresso."
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {venues.map((venue) => (
            <Link
              key={venue.id}
              href={`/loja/${tenantSlug}/${venue.slug}`}
              className="overflow-hidden rounded-lg border border-border bg-surface transition-colors hover:border-border-strong"
            >
              <div className="relative aspect-video w-full bg-bg-subtle">
                {venue.coverPhotoUrl ? (
                  <Image
                    src={venue.coverPhotoUrl}
                    alt={venue.name}
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
                <h2 className="text-base font-semibold text-fg">{venue.name}</h2>
                {(venue.category || venue.address || venue.city) && (
                  <p className="mt-1 text-sm text-fg-muted">
                    {[venue.category, [venue.address, venue.city].filter(Boolean).join(", ")]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      </Card>
    </main>
  );
}
