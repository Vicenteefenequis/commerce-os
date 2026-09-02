import Link from "next/link";
import { redirect } from "next/navigation";
import { backendUrl } from "@/lib/backend-url";
import { Card, CardHeader } from "@/components/ui/card";

interface Venue {
  id: string;
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
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;

  const venuesResponse = await fetch(backendUrl(`/storefront/venues/${tenantId}`), { cache: "no-store" });
  const venuesBody: { venues?: Venue[] } = venuesResponse.ok ? await venuesResponse.json() : {};
  const venues = venuesBody.venues ?? [];

  if (venues.length === 1) {
    redirect(`/loja/${tenantId}/${venues[0].id}`);
  }

  if (venues.length === 0) {
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

  return (
    <main className="mx-auto max-w-2xl p-8">
      <Card>
        <CardHeader title="Escolha onde comprar" description="Este negócio tem mais de um local." />
        <div className="flex flex-col gap-3">
          {venues.map((venue) => (
            <Link
              key={venue.id}
              href={`/loja/${tenantId}/${venue.id}`}
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
