"use client";

import { type ReactNode } from "react";
import * as RadixDialog from "@radix-ui/react-dialog";
import { cn } from "@/lib/cn";

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  trigger?: ReactNode;
}

/**
 * Built on Radix's Dialog primitive (spec: admin/design-system - Dialog is
 * keyboard-operable): Radix owns focus trapping while open, Escape-to-close,
 * and returning focus to the trigger on close - this wrapper only adds
 * token-driven styling.
 */
export function Dialog({ open, onOpenChange, title, description, children, trigger }: DialogProps): ReactNode {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <RadixDialog.Trigger asChild>{trigger}</RadixDialog.Trigger>}
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 bg-black/40" />
        <RadixDialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2",
            "rounded-lg border border-border bg-surface-raised p-6 shadow-lg",
            "focus:outline-none",
          )}
        >
          <RadixDialog.Title className="text-lg font-semibold text-fg">{title}</RadixDialog.Title>
          {description && (
            <RadixDialog.Description className="mt-1 text-sm text-fg-muted">
              {description}
            </RadixDialog.Description>
          )}
          <div className="mt-4">{children}</div>
          <RadixDialog.Close
            aria-label="Fechar"
            className={cn(
              "absolute right-4 top-4 rounded-md p-1 text-fg-muted",
              "hover:bg-bg-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary",
            )}
          >
            ✕
          </RadixDialog.Close>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
