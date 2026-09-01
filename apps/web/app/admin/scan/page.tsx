import { AdminNav } from "@/components/layout/admin-nav";
import { backendFetch } from "@/lib/backend-fetch";
import { ScanContent, type VenueOption } from "./scan-content";

/** spec: access/scanner - authenticated screen, Venue list server-loaded per admin/data-fetching. */
export default async function ScanPage() {
  const venuesRes = await backendFetch("/venues");
  const venuesBody = venuesRes.ok ? await venuesRes.json() : { venues: [] };
  const venues: VenueOption[] = venuesBody.venues ?? [];

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-2xl p-8">
        <ScanContent venues={venues} />
      </main>
    </>
  );
}
