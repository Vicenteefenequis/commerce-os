import { redirect } from "next/navigation";
import { PlatformNav } from "@/components/layout/platform-nav";
import { ToastProvider } from "@/components/ui/toast";
import { backendFetch } from "@/lib/backend-fetch";
import { TenantsContent } from "./tenants-content";

interface Tenant {
  id: string;
  name: string;
  slug: string;
}

export default async function PlatformTenantsPage() {
  const response = await backendFetch("/platform/organizations");

  if (response.status === 401) {
    redirect("/platform/login");
  }

  const body = response.ok ? await response.json() : { organizations: [] };
  const tenants: Tenant[] = body.organizations ?? [];

  return (
    <ToastProvider>
      <PlatformNav />
      <main className="mx-auto max-w-3xl p-8">
        <TenantsContent tenants={tenants} />
      </main>
    </ToastProvider>
  );
}
