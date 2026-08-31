import Link from "next/link";

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-bg/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-4">
        <Link href="/" className="text-sm font-semibold text-fg">
          Commerce OS
        </Link>
        <nav className="ml-auto flex items-center gap-6 text-sm">
          <Link href="/sobre" className="text-fg-muted hover:text-fg">
            Sobre
          </Link>
          <Link href="/admin/login" className="text-fg-muted hover:text-fg">
            Área do parceiro
          </Link>
          <Link
            href="#cta"
            className="rounded-md bg-primary px-3 py-1.5 font-medium text-fg-on-primary hover:bg-primary-hover"
          >
            Quero ser piloto
          </Link>
        </nav>
      </div>
    </header>
  );
}
