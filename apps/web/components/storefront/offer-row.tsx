import { cn } from "@/lib/cn";
import { CapacityBar } from "./capacity-bar";

export interface OfferRowProps {
  weekday: string;
  day: string;
  month: string;
  title: string;
  /** e.g. "22h às 04h · entrada única · pista e mesas" */
  subtitle?: string;
  /** Percentage full, 0-100. Omitted when the offer has no resource-backed variant. */
  capacityPercentFull?: number;
  price?: string;
  priceLabel?: string;
  soldOut?: boolean;
  className?: string;
}

export function OfferRow({
  weekday,
  day,
  month,
  title,
  subtitle,
  capacityPercentFull,
  price,
  priceLabel = "A PARTIR DE",
  soldOut,
  className,
}: OfferRowProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-5 rounded-sf-lg border border-sf-border bg-sf-surface-raised p-4",
        soldOut && "opacity-55",
        className,
      )}
    >
      <div className="w-[52px] flex-shrink-0 text-center">
        <div className="font-mono text-[10px] tracking-[.1em] text-sf-accent">{weekday}</div>
        <div className="text-2xl font-extrabold leading-tight text-sf-fg">{day}</div>
        <div className="font-mono text-[10px] text-sf-fg-subtle">{month}</div>
      </div>
      <div className="flex flex-1 flex-col gap-1.5">
        <div className="text-[16px] font-bold tracking-[-.01em] text-sf-fg">{title}</div>
        {subtitle && <div className="text-[13px] text-sf-fg-subtle">{subtitle}</div>}
        {capacityPercentFull !== undefined && (
          <CapacityBar percentFull={capacityPercentFull} className="max-w-[220px]" />
        )}
      </div>
      {price && (
        <div className="text-right">
          <div className="font-mono text-[10px] tracking-[.1em] text-sf-fg-subtle">{priceLabel}</div>
          <div className="text-lg font-extrabold text-sf-fg">{price}</div>
        </div>
      )}
    </div>
  );
}
