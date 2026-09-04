import { AdminNav } from "@/components/layout/admin-nav";
import { ToastProvider } from "@/components/ui/toast";
import { backendFetch } from "@/lib/backend-fetch";
import { VenuesContent } from "./venues-content";

interface Venue {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  address: string | null;
  city: string | null;
  category: string | null;
  coverPhotoUrl: string | null;
  published: boolean;
}

export default async function VenuesPage() {
  const response = await backendFetch("/venues");
  const body = response.ok ? await response.json() : { venues: [] };
  const venues: Venue[] = body.venues ?? [];

  return (
    <ToastProvider>
      <AdminNav />
      <main className="mx-auto max-w-3xl p-8">
        <VenuesContent venues={venues} />
      </main>
    </ToastProvider>
  );
}
