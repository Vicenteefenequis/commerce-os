import Link from "next/link";
import { backendFetch } from "@/lib/backend-fetch";
import { logout } from "@/app/admin/login/actions";

const LINKS = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/venues", label: "Unidades" },
  { href: "/admin/products", label: "Produtos" },
  { href: "/admin/resources", label: "Recursos" },
  { href: "/admin/orders", label: "Pedidos" },
  { href: "/admin/scan", label: "Scanner" },
];

/** Minimal nav for the manual test pages (spec: catalog/product, capacity/resource - visual smoke testing). */
export async function AdminNav() {
  const response = await backendFetch("/auth/me");
  const session: { email: string; organizationName: string } | null = response.ok
    ? await response.json()
    : null;

  return (
    <nav className="flex items-center gap-4 border-b border-border px-8 py-4">
      <span className="text-sm font-semibold text-fg">Commerce OS</span>
      <div className="flex gap-3">
        {LINKS.map((link) => (
          <Link key={link.href} href={link.href} className="text-sm text-fg-muted hover:text-fg">
            {link.label}
          </Link>
        ))}
      </div>
      {session ? (
        <div className="ml-auto flex items-center gap-3 text-sm text-fg-muted">
          <span>
            {session.email} · {session.organizationName}
          </span>
          <form action={logout}>
            <button type="submit" className="hover:text-fg">
              Sair
            </button>
          </form>
        </div>
      ) : (
        <Link href="/admin/login" className="ml-auto text-sm text-fg-muted hover:text-fg">
          Entrar
        </Link>
      )}
    </nav>
  );
}
