"use client";

import { type ReactNode } from "react";
import { OfferRow } from "@/components/storefront/offer-row";
import { StatTile } from "@/components/storefront/stat-tile";
import { Tabs, TabPanel } from "@/components/storefront/tabs";

export interface Offer {
  id: string;
  name: string;
  weekday: string;
  day: string;
  month: string;
  price: string;
  capacityPercentFull?: number;
}

export interface VenueProfileProps {
  category: string | null;
  city: string | null;
  address: string | null;
  description: string | null;
  ageRestriction: number | null;
  activeOfferCount: number;
  remainingCapacity: number;
  offers: Offer[];
  /** The current lote/checkout selection UI, rendered beneath the offer list (redesign-checkout-lote-panel's scope to replace). */
  children: ReactNode;
}

/**
 * spec: storefront/showcase - "Showcase page presents offers, about, and
 * location as tabs", "Ofertas tab lists each available product as a dated
 * offer", "Profile stat tiles summarize active offers", "Unset profile
 * fields are omitted, not shown as errors". Client Component: tab selection
 * is transient UI state with no server dependency, unlike the visit date
 * (design.md - M12.3), so it doesn't need to live in the URL.
 */
export function VenueProfile({
  category,
  city,
  address,
  description,
  ageRestriction,
  activeOfferCount,
  remainingCapacity,
  offers,
  children,
}: VenueProfileProps) {
  const location = [address, city].filter(Boolean).join(", ");

  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-3">
        <StatTile value={String(activeOfferCount)} label="OFERTAS ATIVAS" />
        <StatTile value={String(remainingCapacity)} label="VAGAS RESTANTES" />
      </div>

      <Tabs
        defaultValue="ofertas"
        tabs={[
          { value: "ofertas", label: "OFERTAS" },
          { value: "sobre", label: "SOBRE" },
          { value: "localizacao", label: "LOCALIZAÇÃO" },
        ]}
      >
        <TabPanel value="ofertas" className="flex flex-col gap-4">
          {offers.length === 0 ? (
            <p className="text-sm text-sf-fg-muted">Nenhuma oferta disponível no momento.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {offers.map((offer) => (
                <a key={offer.id} href={`#offer-${offer.id}`} className="block">
                  <OfferRow
                    weekday={offer.weekday}
                    day={offer.day}
                    month={offer.month}
                    title={offer.name}
                    capacityPercentFull={offer.capacityPercentFull}
                    price={offer.price}
                  />
                </a>
              ))}
            </div>
          )}
          {children}
        </TabPanel>

        <TabPanel value="sobre" className="flex flex-col gap-3">
          {description && <p className="text-sm text-sf-fg">{description}</p>}
          {category && <p className="text-sm text-sf-fg-muted">{category}</p>}
          {ageRestriction != null && (
            <p className="font-mono text-xs tracking-[.08em] text-sf-fg-muted">{ageRestriction}+</p>
          )}
          {!description && !category && ageRestriction == null && (
            <p className="text-sm text-sf-fg-muted">Nenhuma informação adicional.</p>
          )}
        </TabPanel>

        <TabPanel value="localizacao" className="flex flex-col gap-3">
          {location ? (
            <p className="text-sm text-sf-fg">{location}</p>
          ) : (
            <p className="text-sm text-sf-fg-muted">Localização não informada.</p>
          )}
        </TabPanel>
      </Tabs>
    </div>
  );
}
