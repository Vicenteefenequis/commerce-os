"use client";

import { type ReactNode } from "react";
import * as RadixDialog from "@radix-ui/react-dialog";
import { cn } from "@/lib/cn";

export interface ShellMobileProps {
  /** Filter chip row, shown above the content. */
  chips: ReactNode;
  /** Full filter controls, shown inside the bottom sheet. */
  sheetContent: ReactNode;
  sheetOpen: boolean;
  onSheetOpenChange: (open: boolean) => void;
  sheetTitle: string;
  /** Main content area (e.g. the result list). */
  children: ReactNode;
  className?: string;
}

/**
 * Mobile shell (spec: storefront/design-system - Two responsive shell
 * patterns): filter chips plus a bottom sheet for full filter controls,
 * matching the design's M/01-04 proportions. Built on Radix Dialog so focus
 * trapping, Escape-to-close, and focus return are inherited rather than
 * hand-rolled (same reasoning as apps/web/components/ui/dialog.tsx).
 */
export function ShellMobile({
  chips,
  sheetContent,
  sheetOpen,
  onSheetOpenChange,
  sheetTitle,
  children,
  className,
}: ShellMobileProps) {
  return (
    <div className={cn("flex flex-col gap-3 lg:hidden", className)}>
      <div className="flex flex-wrap gap-2">{chips}</div>
      <div>{children}</div>

      <RadixDialog.Root open={sheetOpen} onOpenChange={onSheetOpenChange}>
        <RadixDialog.Portal>
          <RadixDialog.Overlay className="fixed inset-0 z-40 bg-black/50" />
          <RadixDialog.Content
            className={cn(
              "fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto",
              "rounded-t-sf-2xl border-t border-sf-border bg-sf-surface-strong p-6",
              "focus:outline-none",
            )}
          >
            <RadixDialog.Title className="text-base font-bold text-sf-fg">{sheetTitle}</RadixDialog.Title>
            <div className="mt-4">{sheetContent}</div>
            <RadixDialog.Close
              aria-label="Fechar"
              className={cn(
                "absolute right-4 top-4 rounded-sf-md p-1 text-sf-fg-muted",
                "hover:bg-sf-surface-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-sf-accent",
              )}
            >
              ✕
            </RadixDialog.Close>
          </RadixDialog.Content>
        </RadixDialog.Portal>
      </RadixDialog.Root>
    </div>
  );
}
