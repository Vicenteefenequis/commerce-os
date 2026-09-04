import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-bg/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-4">
        <Link href="/" className="text-fg">
          <Logo />
        </Link>
        <nav className="ml-auto flex items-center gap-6 text-sm">
          <Link href="/sobre" className="text-fg-muted hover:text-fg">
            Sobre
          </Link>
          <Link href="/admin/login" className="text-fg-muted hover:text-fg">
            Área do parceiro
          </Link>
          <Link href="#cta" className="btn-primary-gradient rounded-full px-4 py-2 font-semibold">
            Começar agora
          </Link>
        </nav>
      </div>
    </header>
  );
}
