import { type ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface ShellDesktopProps {
  /** Persistent left filter rail content. */
  rail: ReactNode;
  /** Main content area. */
  children: ReactNode;
  className?: string;
}

/**
 * Desktop shell (spec: storefront/design-system - Two responsive shell
 * patterns): a persistent left filter rail beside a scrolling main content
 * area, matching the design's W1/W2 proportions.
 */
export function ShellDesktop({ rail, children, className }: ShellDesktopProps) {
  return (
    <div className={cn("hidden lg:flex lg:items-start", className)}>
      <aside className="w-[290px] flex-shrink-0 border-r border-sf-border p-8">{rail}</aside>
      <main className="min-w-0 flex-1 p-8">{children}</main>
    </div>
  );
}
