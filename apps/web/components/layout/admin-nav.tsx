import Link from "next/link";

const LINKS = [
  { href: "/venues", label: "Unidades" },
  { href: "/products", label: "Produtos" },
  { href: "/resources", label: "Recursos" },
];

/** Minimal nav for the manual test pages (spec: catalog/product, capacity/resource - visual smoke testing). */
export function AdminNav() {
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
      <Link href="/login" className="ml-auto text-sm text-fg-muted hover:text-fg">
        Entrar
      </Link>
    </nav>
  );
}
