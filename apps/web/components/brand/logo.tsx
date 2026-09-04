import { cn } from "@/lib/cn";

/**
 * Icon bars use currentColor so they invert correctly against dark and light
 * surfaces (e.g. platform-nav vs. the marketing header) — every call site
 * already sets a text color class, so no light/dark variant prop is needed.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg width="24" height="24" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <path d="M7 7 V25" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M25 7 V25" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M12 16 H21" stroke="var(--color-primary)" strokeWidth="2.6" strokeLinecap="round" />
        <path
          d="M18 12.5 L21.5 16 L18 19.5"
          stroke="var(--color-primary)"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="text-base font-extrabold tracking-tight">
        Ingressa<span className="font-normal text-fg-muted">fluxo</span>
      </span>
    </span>
  );
}
