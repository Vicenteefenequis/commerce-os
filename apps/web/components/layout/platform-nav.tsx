import Link from "next/link";
import { platformLogout } from "@/app/platform/login/actions";
import { Logo } from "@/components/brand/logo";

/** Nav for the platform console, deliberately separate from AdminNav (no tenant, no venue-scoped links). */
export function PlatformNav() {
  return (
    <nav className="flex items-center gap-4 border-b border-border px-8 py-4">
      <span className="flex items-center gap-2 text-sm font-semibold text-fg">
        <Logo />
        <span className="text-fg-muted">· Plataforma</span>
      </span>
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
