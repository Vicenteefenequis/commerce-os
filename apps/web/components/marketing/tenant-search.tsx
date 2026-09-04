"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface DiscoverableTenant {
  tenantSlug: string;
  organizationName: string;
}

type Status = "idle" | "loading" | "done" | "error";

/**
 * spec: marketing/landing-page - "Landing page provides a tenant search
 * entry point"; storefront/discovery - "Tenant discovery search is public
 * and cross-tenant". Consumer-facing search, alongside the page's
 * existing business-recruitment sections - not the B2B lead-capture form.
 */
export function TenantSearch() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [results, setResults] = useState<DiscoverableTenant[]>([]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!query.trim()) return;

    setStatus("loading");
    const response = await fetch(`/api/discovery/tenants?q=${encodeURIComponent(query.trim())}`, {
      cache: "no-store",
    });
    if (!response.ok) {
      setStatus("error");
      return;
    }
    const body: { tenants?: DiscoverableTenant[] } = await response.json();
    setResults(body.tenants ?? []);
    setStatus("done");
  }

  return (
    <section id="buscar" className="px-6 py-16">
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4 rounded-2xl border border-border bg-surface p-8 text-center">
        <h2 className="text-lg font-semibold text-fg">Já sabe onde comprar? Encontre o estabelecimento</h2>
        <form onSubmit={onSubmit} className="flex w-full flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Input
              label="Nome do estabelecimento"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Bar do João"
            />
          </div>
          <Button type="submit" isLoading={status === "loading"}>
            Buscar
          </Button>
        </form>

        {status === "error" && (
          <p className="text-sm text-danger">Não foi possível buscar agora. Tente novamente.</p>
        )}

        {status === "done" && (
          <div className="flex w-full flex-col gap-2 text-left">
            {results.length === 0 ? (
              <p className="text-sm text-fg-muted">Nenhum estabelecimento encontrado.</p>
            ) : (
              results.map((tenant) => (
                <Link
                  key={tenant.tenantSlug}
                  href={`/loja/${tenant.tenantSlug}`}
                  className="rounded-md border border-border p-3 text-sm font-medium text-fg hover:bg-bg-subtle"
                >
                  {tenant.organizationName}
                </Link>
              ))
            )}
          </div>
        )}
      </div>
    </section>
  );
}
