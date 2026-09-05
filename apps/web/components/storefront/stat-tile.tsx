import { cn } from "@/lib/cn";

export interface StatTileProps {
  value: string;
  label: string;
  className?: string;
}

/**
 * spec: storefront/showcase - "Profile stat tiles summarize active offers".
 * A rating tile is deliberately not modeled here yet - reserved for
 * `add-venue-ratings` to add alongside these (design.md - Non-Goals).
 */
export function StatTile({ value, label, className }: StatTileProps) {
  return (
    <div
      className={cn(
        "flex flex-1 flex-col items-center gap-0.5 rounded-sf-lg border border-sf-border bg-sf-surface-raised px-4 py-3",
        className,
      )}
    >
      <span className="text-lg font-extrabold text-sf-fg">{value}</span>
      <span className="font-mono text-[10px] tracking-[.08em] text-sf-fg-subtle">{label}</span>
    </div>
  );
}
