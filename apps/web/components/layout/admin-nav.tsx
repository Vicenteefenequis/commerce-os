import { backendFetch } from "@/lib/backend-fetch";
import { logout } from "@/app/admin/login/actions";
import { AdminNavClient } from "./admin-nav-client";

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

  return <AdminNavClient links={LINKS} session={session} logoutAction={logout} />;
}
