import Link from "next/link";
import { platformLogout } from "@/app/platform/login/actions";

/** Nav for the platform console, deliberately separate from AdminNav (no tenant, no venue-scoped links). */
export function PlatformNav() {
  return (
    <nav className="flex items-center gap-4 border-b border-border px-8 py-4">
      <span className="text-sm font-semibold text-fg">Commerce OS · Plataforma</span>
      <Link href="/platform/tenants" className="text-sm text-fg-muted hover:text-fg">
        Tenants
      </Link>
      <form action={platformLogout} className="ml-auto">
        <button type="submit" className="text-sm text-fg-muted hover:text-fg">
          Sair
        </button>
      </form>
    </nav>
  );
}
