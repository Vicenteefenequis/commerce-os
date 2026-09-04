"use client";

import { useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function MarketingHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-bg/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-4">
        <Link href="/" className="text-fg">
          <Logo />
        </Link>

        <nav className="ml-auto hidden items-center gap-6 text-sm md:flex">
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

        <button
          type="button"
          className="ml-auto flex items-center justify-center rounded-md p-2 text-fg-muted hover:bg-bg-subtle hover:text-fg md:hidden"
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <CloseIcon /> : <MenuIcon />}
        </button>
      </div>

      {open && (
        <nav className="flex flex-col gap-1 border-t border-border px-6 py-3 text-sm md:hidden">
          <Link
            href="/sobre"
            onClick={() => setOpen(false)}
            className="rounded-md px-2 py-2 text-fg-muted hover:bg-bg-subtle hover:text-fg"
          >
            Sobre
          </Link>
          <Link
            href="/admin/login"
            onClick={() => setOpen(false)}
            className="rounded-md px-2 py-2 text-fg-muted hover:bg-bg-subtle hover:text-fg"
          >
            Área do parceiro
          </Link>
          <Link
            href="#cta"
            onClick={() => setOpen(false)}
            className="btn-primary-gradient mt-1 rounded-full px-4 py-2 text-center font-semibold"
          >
            Começar agora
          </Link>
        </nav>
      )}
    </header>
  );
}
