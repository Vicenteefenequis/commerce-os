import { cn } from "@/lib/cn";

export interface LoteRowProps {
  name: string;
  /** e.g. "180 disponíveis" or "6 mesas restantes" */
  availabilityLabel: string;
  price: string;
  selected?: boolean;
  disabled?: boolean;
  onSelect?: () => void;
  className?: string;
}

/**
 * Radio-style tier row (spec: storefront/design-system). Presentational -
 * selection state and the onSelect callback are the only interactivity;
 * the caller owns which lote is selected.
 */
export function LoteRow({
  name,
  availabilityLabel,
  price,
  selected,
  disabled,
  onSelect,
  className,
}: LoteRowProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-3 rounded-sf-md border p-3.5 text-left transition-colors",
        selected
          ? "border-sf-accent bg-sf-accent/10"
          : "border-sf-border hover:border-sf-border-strong",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "h-[18px] w-[18px] flex-shrink-0 rounded-sf-pill border-2",
          selected ? "border-[5px] border-sf-accent bg-sf-surface" : "border-sf-border-strong",
        )}
      />
      <span className="flex-1">
        <span className="block text-[15px] font-bold text-sf-fg">{name}</span>
        <span className="block text-xs text-sf-fg-subtle">{availabilityLabel}</span>
      </span>
      <span className="text-base font-extrabold text-sf-fg">{price}</span>
    </button>
  );
}
