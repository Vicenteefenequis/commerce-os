import { type ReactNode } from "react";
import { cn } from "@/lib/cn";

export type BadgeVariant = "verified" | "capacity" | "sold-out" | "neutral";

export interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  verified:
    "h-[18px] w-[18px] justify-center rounded-sf-pill bg-sf-accent text-sf-on-accent text-[11px] font-extrabold",
  capacity: "rounded-sf-pill bg-sf-bg/75 px-2.5 py-1 font-mono text-[10px] tracking-[.1em] text-sf-warning",
  "sold-out": "rounded-sf-pill bg-sf-bg/75 px-2.5 py-1 font-mono text-[10px] tracking-[.1em] text-sf-fg-muted",
  neutral: "rounded-sf-pill border border-sf-border px-3 py-1.5 text-[13px] text-sf-fg-muted",
};

/**
 * Covers the design's three recurring pill/badge treatments (spec:
 * storefront/design-system): a verified checkmark, a "% lotado" capacity
 * pill, and an "esgotado hoje" sold-out pill, plus a plain neutral pill for
 * general filter/status use.
 */
export function Badge({ variant = "neutral", children, className }: BadgeProps) {
  return (
    <span className={cn("inline-flex items-center gap-1", VARIANT_CLASSES[variant], className)}>
      {children}
    </span>
  );
}

export function VerifiedBadge({ className }: { className?: string }) {
  return (
    <Badge variant="verified" className={className}>
      <span aria-hidden="true">✓</span>
      <span className="sr-only">Verificado</span>
    </Badge>
  );
}
