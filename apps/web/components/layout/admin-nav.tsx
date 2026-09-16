import { backendFetch } from "@/lib/backend-fetch";
import { logout } from "@/app/admin/login/actions";
import { navLinksForRoles } from "@/lib/roles";
import { AdminNavClient } from "./admin-nav-client";

/**
 * spec: admin/*, openspec change add-venue-scoped-user-roles - nav links
 * are filtered by the session's role(s) (Admin: everything incl.
 * Usuários; Gerente: Unidades/Pedidos/Recursos; Vendedor: only Venda no
 * balcão; Validador: only Scanner). This is cosmetic, not the security
 * boundary (design.md D5) - the backend enforces every route regardless.
 */
export async function AdminNav() {
  const response = await backendFetch("/auth/me");
  const session: { email: string; organizationName: string; roles?: string[] } | null = response.ok
    ? await response.json()
    : null;

  const links = navLinksForRoles(session?.roles ?? []);

  return <AdminNavClient links={links} session={session} logoutAction={logout} />;
}
