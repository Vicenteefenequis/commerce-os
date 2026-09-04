"use client";

import { useState } from "react";
import { Archivo, JetBrains_Mono } from "next/font/google";
// theme.css reaches this page via app/globals.css's @import (loaded by the
// root layout); no direct CSS import needed here.
import { CapacityBar } from "@/components/storefront/capacity-bar";
import { Badge, VerifiedBadge } from "@/components/storefront/badge";
import { VenueCard } from "@/components/storefront/venue-card";
import { OfferRow } from "@/components/storefront/offer-row";
import { LoteRow } from "@/components/storefront/lote-row";
import { FilterChip } from "@/components/storefront/filter-chip";
import { ShellDesktop } from "@/components/storefront/shell-desktop";
import { ShellMobile } from "@/components/storefront/shell-mobile";

const archivo = Archivo({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--sf-font-archivo" });
const jetBrainsMono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--sf-font-jetbrains-mono" });

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-mono text-xs tracking-[.16em] text-sf-fg-subtle">{title}</h2>
      {children}
    </section>
  );
}

/**
 * Internal, unlinked preview exercising every storefront-design-system
 * component and both shells (task 4.1) - not `_preview`, since a Next.js
 * App Router folder prefixed with `_` is excluded from routing entirely.
 */
export default function StorefrontDesignSystemPreview() {
  const [selectedLote, setSelectedLote] = useState<"pista" | "mesa">("pista");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [chipSelected, setChipSelected] = useState(true);

  return (
    <div className={`storefront-theme ${archivo.variable} ${jetBrainsMono.variable} min-h-screen p-10`}>
      <div className="flex flex-col gap-12">
        <Section title="CAPACITY BAR — normal / warning / critical / sold-out">
          <div className="flex max-w-md flex-col gap-3">
            <CapacityBar percentFull={50} />
            <CapacityBar percentFull={75} />
            <CapacityBar percentFull={95} />
            <CapacityBar percentFull={100} />
          </div>
        </Section>

        <Section title="BADGE">
          <div className="flex items-center gap-3">
            <VerifiedBadge />
            <Badge variant="capacity">62% LOTADO</Badge>
            <Badge variant="sold-out">ESGOTADO HOJE</Badge>
            <Badge variant="neutral">SÃO PAULO, SP</Badge>
          </div>
        </Section>

        <Section title="VENUE CARD">
          <div className="grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
            <VenueCard
              name="Bar do João"
              verified
              subtitle="@bardojoao · Pinheiros · 1,2 km"
              capacityPercentFull={62}
              priceFrom="R$ 30"
              offerSummary="3 ofertas hoje"
            />
            <VenueCard
              name="Quintal 47"
              subtitle="@quintal47 · V. Madalena · 2,0 km"
              capacityPercentFull={94}
              priceFrom="R$ 45"
              offerSummary="Últimas 18 entradas"
            />
          </div>
        </Section>

        <Section title="OFFER ROW">
          <div className="flex max-w-xl flex-col gap-3">
            <OfferRow
              weekday="SEX"
              day="19"
              month="SET"
              title="Sexta Sertaneja"
              subtitle="22h às 04h · entrada única"
              capacityPercentFull={64}
              price="R$ 30"
            />
            <OfferRow
              weekday="DOM"
              day="21"
              month="SET"
              title="Pagode da Tarde"
              subtitle="ESGOTADO · LISTA DE ESPERA ABERTA"
              soldOut
            />
          </div>
        </Section>

        <Section title="LOTE ROW">
          <div className="flex max-w-md flex-col gap-2.5">
            <LoteRow
              name="Lote 2 · Pista"
              availabilityLabel="180 disponíveis"
              price="R$ 30"
              selected={selectedLote === "pista"}
              onSelect={() => setSelectedLote("pista")}
            />
            <LoteRow
              name="Mesa para 4"
              availabilityLabel="6 mesas restantes"
              price="R$ 120"
              selected={selectedLote === "mesa"}
              onSelect={() => setSelectedLote("mesa")}
            />
            <LoteRow name="Camarote" availabilityLabel="Esgotado" price="R$ 200" disabled />
          </div>
        </Section>

        <Section title="FILTER CHIP">
          <div className="flex gap-2">
            <FilterChip selected={chipSelected} onClick={() => setChipSelected((v) => !v)} count={3}>
              FILTROS
            </FilterChip>
            <FilterChip>HOJE</FilterChip>
            <FilterChip>COM VAGAS</FilterChip>
          </div>
        </Section>

        <Section title="SHELL — desktop (persistent rail)">
          <ShellDesktop rail={<div className="text-sm text-sf-fg-muted">Filter rail content</div>}>
            <div className="text-sm text-sf-fg-muted">Main content area</div>
          </ShellDesktop>
        </Section>

        <Section title="SHELL — mobile (chips + bottom sheet)">
          <ShellMobile
            chips={
              <>
                <FilterChip selected count={3} onClick={() => setMobileFiltersOpen(true)}>
                  FILTROS
                </FilterChip>
                <FilterChip onClick={() => setMobileFiltersOpen(true)}>HOJE</FilterChip>
              </>
            }
            sheetOpen={mobileFiltersOpen}
            onSheetOpenChange={setMobileFiltersOpen}
            sheetTitle="Filtros"
            sheetContent={<div className="text-sm text-sf-fg-muted">Full filter controls go here.</div>}
          >
            <div className="text-sm text-sf-fg-muted">Main content area</div>
          </ShellMobile>
        </Section>
      </div>
    </div>
  );
}
