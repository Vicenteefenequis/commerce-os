import { redirect } from "next/navigation";
import { AdminNav } from "@/components/layout/admin-nav";
import { ToastProvider } from "@/components/ui/toast";
import { backendFetch } from "@/lib/backend-fetch";
import { ResourcesContent } from "./resources-content";

interface Venue {
  id: string;
  name: string;
}

interface Resource {
  id: string;
  venueId: string;
  name: string;
  defaultCapacity: number;
  hardCapacity: boolean;
}

export default async function ResourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ venueId?: string }>;
}) {
  const { venueId: requestedVenueId } = await searchParams;

  const venuesResponse = await backendFetch("/venues");
  if (venuesResponse.status === 401) redirect("/admin/login");
  const venuesBody = venuesResponse.ok ? await venuesResponse.json() : { venues: [] };
  const venues: Venue[] = venuesBody.venues ?? [];

  const venueId = requestedVenueId ?? venues[0]?.id;

  let resources: Resource[] = [];
  if (venueId) {
    const resourcesResponse = await backendFetch(`/resources?venueId=${venueId}`);
    if (resourcesResponse.ok) {
      const resourcesBody = await resourcesResponse.json();
      resources = resourcesBody.resources ?? [];
    }
  }

  return (
    <ToastProvider>
      <AdminNav />
      <main className="mx-auto max-w-4xl p-8">
        <ResourcesContent key={venueId ?? "none"} venues={venues} venueId={venueId} resources={resources} />
      </main>
    </ToastProvider>
  );
}
