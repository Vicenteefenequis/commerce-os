"use client";

import { useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";

interface NavLink {
  href: string;
  label: string;
}

interface Session {
  email: string;
  organizationName: string;
}

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

export function AdminNavClient({
  links,
  session,
  logoutAction,
}: {
  links: NavLink[];
  session: Session | null;
  logoutAction: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <nav className="border-b border-border">
      <div className="flex items-center gap-4 px-4 py-4 sm:px-8">
        <Logo className="text-fg" />

        <div className="hidden flex-1 items-center gap-4 md:flex">
          <div className="flex flex-wrap gap-3">
            {links.map((link) => (
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
              <form action={logoutAction}>
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
        </div>

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
        <div className="flex flex-col gap-1 border-t border-border px-4 py-3 md:hidden">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="rounded-md px-2 py-2 text-sm text-fg-muted hover:bg-bg-subtle hover:text-fg"
            >
              {link.label}
            </Link>
          ))}
          <div className="mt-2 border-t border-border pt-2">
            {session ? (
              <>
                <p className="px-2 py-1 text-sm text-fg-muted">
                  {session.email} · {session.organizationName}
                </p>
                <form action={logoutAction}>
                  <button
                    type="submit"
                    className="w-full rounded-md px-2 py-2 text-left text-sm text-fg-muted hover:bg-bg-subtle hover:text-fg"
                  >
                    Sair
                  </button>
                </form>
              </>
            ) : (
              <Link
                href="/admin/login"
                onClick={() => setOpen(false)}
                className="block rounded-md px-2 py-2 text-sm text-fg-muted hover:bg-bg-subtle hover:text-fg"
              >
                Entrar
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
