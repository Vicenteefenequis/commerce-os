import Link from "next/link";

export function MarketingFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-8 text-sm text-fg-muted sm:flex-row sm:items-center sm:justify-between">
        <span>&copy; {new Date().getFullYear()} Commerce OS.</span>
        <div className="flex gap-4">
          <Link href="/sobre" className="hover:text-fg">
            Sobre
          </Link>
          <Link href="/admin/login" className="hover:text-fg">
            Área do parceiro
          </Link>
        </div>
      </div>
    </footer>
  );
}
