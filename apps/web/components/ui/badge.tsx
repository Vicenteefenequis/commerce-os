import { type ReactNode } from "react";
import { cn } from "@/lib/cn";

export type BadgeVariant = "neutral" | "success" | "danger" | "warning";

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  neutral: "bg-bg-subtle text-fg-muted",
  success: "bg-success/15 text-success",
  danger: "bg-danger/15 text-danger",
  warning: "bg-warning/15 text-warning",
};

export function Badge({ variant = "neutral", children }: { variant?: BadgeVariant; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        VARIANT_CLASSES[variant],
      )}
    >
      {children}
    </span>
  );
}
