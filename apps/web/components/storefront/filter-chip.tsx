import { type ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface FilterChipProps {
  children: ReactNode;
  selected?: boolean;
  count?: number;
  onClick?: () => void;
  className?: string;
}

export function FilterChip({ children, selected, count, onClick, className }: FilterChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sf-pill px-3 py-1.5 font-mono text-[12px] transition-colors",
        selected
          ? "bg-sf-accent font-bold text-sf-on-accent"
          : "border border-sf-border text-sf-fg-muted hover:border-sf-border-strong",
        className,
      )}
    >
      {children}
      {count !== undefined && (
        <span className={cn("opacity-80", selected ? "text-sf-on-accent" : "text-sf-fg-subtle")}>
          · {count}
        </span>
      )}
    </button>
  );
}
