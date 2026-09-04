import { cn } from "@/lib/cn";
import { CapacityBar } from "./capacity-bar";
import { VerifiedBadge } from "./badge";

export interface VenueCardProps {
  name: string;
  verified?: boolean;
  /** e.g. "@bardojoao · Pinheiros · 1,2 km" */
  subtitle: string;
  /** Percentage full, 0-100. Omit when no resource-backed offer exists. */
  capacityPercentFull?: number;
  priceFrom?: string;
  /** e.g. "3 ofertas hoje" */
  offerSummary?: string;
  coverImageUrl?: string;
  className?: string;
}

/**
 * Presentational only (spec: storefront/design-system - Base storefront
 * components are presentational): accepts resolved primitive props, does
 * not fetch or know about any tenant/product/resource API shape.
 */
export function VenueCard({
  name,
  verified,
  subtitle,
  capacityPercentFull,
  priceFrom,
  offerSummary,
  coverImageUrl,
  className,
}: VenueCardProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-sf-xl border border-sf-border-strong bg-sf-surface-raised",
        className,
      )}
    >
      <div
        className="h-[150px] bg-sf-surface bg-cover bg-center"
        style={coverImageUrl ? { backgroundImage: `url(${coverImageUrl})` } : undefined}
      />
      <div className="flex flex-col gap-2 p-4">
        <div className="flex items-center gap-1.5">
          <span className="text-[17px] font-bold tracking-[-.01em] text-sf-fg">{name}</span>
          {verified && <VerifiedBadge />}
        </div>
        <div className="font-mono text-[11px] text-sf-fg-subtle">{subtitle}</div>
        {capacityPercentFull !== undefined && <CapacityBar percentFull={capacityPercentFull} />}
        {(offerSummary || priceFrom) && (
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-[13px] text-sf-fg-subtle">{offerSummary}</span>
            {priceFrom && <span className="text-[16px] font-extrabold text-sf-fg">{priceFrom}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
