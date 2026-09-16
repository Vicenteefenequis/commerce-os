/**
 * openspec change add-venue-scoped-user-roles: the four admin roles and
 * which nav links/screens each can reach. Mirrors
 * apps/backend/src/modules/authorization/domain/role.ts's ROLES - kept as
 * a plain string union (not imported across the app/web <-> backend
 * boundary) like every other backend enum surfaced to the frontend (see
 * lib/order-status.ts).
 */
export type Role = "admin" | "gerente" | "vendedor" | "validador";

export interface NavLink {
  href: string;
  label: string;
}

const ADMIN_LINKS: NavLink[] = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/venues", label: "Unidades" },
  { href: "/admin/products", label: "Produtos" },
  { href: "/admin/resources", label: "Recursos" },
  { href: "/admin/orders", label: "Pedidos" },
  { href: "/admin/counter-sales", label: "Venda no balcão" },
  { href: "/admin/scan", label: "Scanner" },
  { href: "/admin/users", label: "Usuários" },
];

const GERENTE_LINKS: NavLink[] = [
  { href: "/admin/venues", label: "Unidades" },
  { href: "/admin/orders", label: "Pedidos" },
  { href: "/admin/resources", label: "Recursos" },
];

const VENDEDOR_LINKS: NavLink[] = [{ href: "/admin/counter-sales", label: "Venda no balcão" }];

const VALIDADOR_LINKS: NavLink[] = [{ href: "/admin/scan", label: "Scanner" }];

/**
 * spec: admin/dashboard - "Dashboard is the default admin landing screen"
 * (MODIFIED: only for Admin; every other role lands on the first screen
 * their role permits). admin/*: "Nav visibility per role" (proposal.md).
 */
export const ROLE_LINKS: Record<Role, NavLink[]> = {
  admin: ADMIN_LINKS,
  gerente: GERENTE_LINKS,
  vendedor: VENDEDOR_LINKS,
  validador: VALIDADOR_LINKS,
};

/** The screen a session with these roles should land on with no other destination in mind. */
export function firstAllowedPath(roles: string[]): string {
  for (const role of roles) {
    const links = ROLE_LINKS[role as Role];
    if (links?.[0]) return links[0].href;
  }
  return "/admin/login";
}

/** Every nav link visible to a session holding any of these roles, de-duplicated by href, in a stable role-priority order. */
export function navLinksForRoles(roles: string[]): NavLink[] {
  const seen = new Set<string>();
  const links: NavLink[] = [];
  for (const role of ["admin", "gerente", "vendedor", "validador"] as Role[]) {
    if (!roles.includes(role)) continue;
    for (const link of ROLE_LINKS[role]) {
      if (seen.has(link.href)) continue;
      seen.add(link.href);
      links.push(link);
    }
  }
  return links;
}
