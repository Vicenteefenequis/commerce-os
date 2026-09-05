"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FilterChip } from "@/components/storefront/filter-chip";
import { ShellDesktop } from "@/components/storefront/shell-desktop";
import { ShellMobile } from "@/components/storefront/shell-mobile";
import { VenueCard } from "@/components/storefront/venue-card";
import {
  DEFAULT_CITY_LOCATION,
  formatDistanceKm,
  formatPriceFromCents,
  type CategoryFacet,
  type DiscoverableTenant,
  type DiscoveryFilters,
} from "./discovery-filters";

const WHEN_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "today", label: "Hoje" },
  { value: "weekend", label: "Fim de semana" },
];

function useUpdateSearchParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function update(patch: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === "") params.delete(key);
      else params.set(key, value);
    }
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  return { update, isPending };
}

/** Wires browser geolocation with a decline path to a city-level default (task 3.5). */
function useDiscoveryGeolocation(hasLocation: boolean, update: (patch: Record<string, string | null>) => void) {
  useEffect(() => {
    if (hasLocation) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      update({ lat: String(DEFAULT_CITY_LOCATION.lat), lng: String(DEFAULT_CITY_LOCATION.lng) });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        update({ lat: String(position.coords.latitude), lng: String(position.coords.longitude) });
      },
      () => {
        update({ lat: String(DEFAULT_CITY_LOCATION.lat), lng: String(DEFAULT_CITY_LOCATION.lng) });
      },
      { timeout: 5000 },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasLocation]);
}

function FilterControls({
  filters,
  categoryFacets,
  onUpdate,
}: {
  filters: DiscoveryFilters;
  categoryFacets: CategoryFacet[];
  onUpdate: (patch: Record<string, string | null>) => void;
}) {
  const [priceInput, setPriceInput] = useState(
    filters.maxPriceCents !== null ? String(Math.round(filters.maxPriceCents / 100)) : "",
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <span className="font-mono text-[11px] tracking-[.16em] text-sf-fg-subtle">QUANDO</span>
        <div className="flex flex-wrap gap-2">
          {WHEN_OPTIONS.map((option) => (
            <FilterChip
              key={option.value}
              selected={filters.when === option.value}
              onClick={() => onUpdate({ when: option.value === "today" ? null : option.value })}
            >
              {option.label}
            </FilterChip>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="font-mono text-[11px] tracking-[.16em] text-sf-fg-subtle">CATEGORIA</span>
        <div className="flex flex-wrap gap-2">
          {categoryFacets.map((facet) => (
            <FilterChip
              key={facet.category}
              selected={filters.category === facet.category}
              count={facet.count}
              onClick={() =>
                onUpdate({ category: filters.category === facet.category ? null : facet.category })
              }
            >
              {facet.category}
            </FilterChip>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="font-mono text-[11px] tracking-[.16em] text-sf-fg-subtle">DISPONIBILIDADE</span>
        <FilterChip
          selected={filters.availability === "include-sold-out"}
          onClick={() =>
            onUpdate({
              availability: filters.availability === "include-sold-out" ? null : "include-sold-out",
            })
          }
        >
          Incluir esgotados
        </FilterChip>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="discovery-max-price" className="font-mono text-[11px] tracking-[.16em] text-sf-fg-subtle">
          PREÇO MÁXIMO (R$)
        </label>
        <input
          id="discovery-max-price"
          type="number"
          min={0}
          step={1}
          value={priceInput}
          onChange={(e) => setPriceInput(e.target.value)}
          onBlur={() => {
            const parsed = Number(priceInput);
            onUpdate({ maxPriceCents: priceInput && parsed > 0 ? String(Math.round(parsed * 100)) : null });
          }}
          placeholder="Sem limite"
          className="rounded-sf-md border border-sf-border bg-sf-surface px-3 py-2 text-sm text-sf-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-sf-accent"
        />
      </div>
    </div>
  );
}

function DiscoveryResults({ tenants }: { tenants: DiscoverableTenant[] }) {
  if (tenants.length === 0) {
    return <p className="text-sm text-sf-fg-muted">Nenhum estabelecimento encontrado com esses filtros.</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {tenants.map((tenant) => (
        <Link key={tenant.tenantSlug} href={`/loja/${tenant.tenantSlug}`}>
          <VenueCard
            name={tenant.organizationName}
            verified={tenant.verified}
            subtitle={[tenant.category, tenant.distanceKm !== null ? formatDistanceKm(tenant.distanceKm) : null]
              .filter(Boolean)
              .join(" · ")}
            capacityPercentFull={tenant.capacityPercentFull ?? undefined}
            priceFrom={tenant.priceFromCents !== null ? formatPriceFromCents(tenant.priceFromCents) : undefined}
          />
        </Link>
      ))}
    </div>
  );
}

export function DiscoveryContent({
  tenants,
  categoryFacets,
  filters,
}: {
  tenants: DiscoverableTenant[];
  categoryFacets: CategoryFacet[];
  filters: DiscoveryFilters;
}) {
  const { update } = useUpdateSearchParams();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  useDiscoveryGeolocation(filters.hasLocation, update);

  const activeFilterCount = [
    filters.category,
    filters.when !== "today" ? filters.when : null,
    filters.availability === "include-sold-out" ? filters.availability : null,
    filters.maxPriceCents,
  ].filter(Boolean).length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 lg:px-8">
      <h1 className="mb-6 text-2xl font-extrabold text-sf-fg">Descubra estabelecimentos</h1>

      <ShellDesktop rail={<FilterControls filters={filters} categoryFacets={categoryFacets} onUpdate={update} />}>
        <DiscoveryResults tenants={tenants} />
      </ShellDesktop>

      <ShellMobile
        chips={
          <>
            <FilterChip selected={activeFilterCount > 0} count={activeFilterCount || undefined} onClick={() => setMobileFiltersOpen(true)}>
              Filtros
            </FilterChip>
            {WHEN_OPTIONS.map((option) => (
              <FilterChip
                key={option.value}
                selected={filters.when === option.value}
                onClick={() => update({ when: option.value === "today" ? null : option.value })}
              >
                {option.label}
              </FilterChip>
            ))}
          </>
        }
        sheetOpen={mobileFiltersOpen}
        onSheetOpenChange={setMobileFiltersOpen}
        sheetTitle="Filtros"
        sheetContent={<FilterControls filters={filters} categoryFacets={categoryFacets} onUpdate={update} />}
      >
        <DiscoveryResults tenants={tenants} />
      </ShellMobile>
    </div>
  );
}
