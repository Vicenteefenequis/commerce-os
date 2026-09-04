import { cn } from "@/lib/cn";

export type CapacityBand = "normal" | "warning" | "critical" | "sold-out";

/**
 * Single shared color-band rule (spec: storefront/design-system - Capacity
 * bar has a single shared color rule; design.md D4): normal below 70%,
 * warning 70-90%, critical above 90%, and a distinct sold-out band at 100%.
 */
export function capacityBand(percentFull: number): CapacityBand {
  if (percentFull >= 100) return "sold-out";
  if (percentFull > 90) return "critical";
  if (percentFull >= 70) return "warning";
  return "normal";
}

const FILL_CLASSES: Record<CapacityBand, string> = {
  normal: "bg-sf-accent",
  warning: "bg-sf-warning",
  critical: "bg-sf-danger",
  "sold-out": "bg-sf-sold-out",
};

export interface CapacityBarProps {
  /** Percentage full, 0-100. Values outside this range are clamped. */
  percentFull: number;
  className?: string;
}

export function CapacityBar({ percentFull, className }: CapacityBarProps) {
  const clamped = Math.min(100, Math.max(0, percentFull));
  const band = capacityBand(clamped);

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      data-band={band}
      className={cn("h-[5px] w-full overflow-hidden rounded-sf-pill bg-sf-border", className)}
    >
      <div
        className={cn("h-full rounded-sf-pill transition-[width]", FILL_CLASSES[band])}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
