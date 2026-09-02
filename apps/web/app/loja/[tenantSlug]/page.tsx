import Link from "next/link";
import { redirect } from "next/navigation";
import { backendUrl } from "@/lib/backend-url";
import { Card, CardHeader } from "@/components/ui/card";

interface Venue {
  id: string;
  slug: string;
  name: string;
}

/**
 * Public, account-less tenant storefront entry point (spec:
 * storefront/tenant-entry). Lands a shared tenant link somewhere: skips
 * straight to the venue when there's only one, otherwise lists venues to
 * pick from.
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
        <div className="flex flex-col gap-3">
          {venues.map((venue) => (
            <Link
              key={venue.id}
              href={`/loja/${tenantSlug}/${venue.slug}`}
              className="rounded-md border border-border p-4 text-sm font-medium text-fg hover:bg-bg-subtle"
            >
              {venue.name}
            </Link>
          ))}
        </div>
      </Card>
    </main>
  );
}
