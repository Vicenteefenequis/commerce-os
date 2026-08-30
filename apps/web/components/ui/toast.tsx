"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import * as RadixToast from "@radix-ui/react-toast";
import { cn } from "@/lib/cn";

export type ToastVariant = "success" | "error";

interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  showToast: (toast: Omit<ToastItem, "id">) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const VARIANT_CLASSES: Record<ToastVariant, string> = {
  success: "border-success/40 bg-surface-raised",
  error: "border-danger/40 bg-surface-raised",
};

/**
 * spec: admin/design-system - Consistent async operation feedback. Built on
 * Radix's Toast primitive: it owns auto-dismiss timing and swipe-to-dismiss;
 * this wrapper adds the success/error variant styling and a simple
 * showToast() API any screen can call.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((toast: Omit<ToastItem, "id">) => {
    const id = crypto.randomUUID();
    setToasts((current) => [...current, { ...toast, id }]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      <RadixToast.Provider swipeDirection="right" duration={5000}>
        {children}
        {toasts.map((toast) => (
          <RadixToast.Root
            key={toast.id}
            onOpenChange={(open) => {
              if (!open) dismiss(toast.id);
            }}
            className={cn(
              "relative rounded-md border p-4 shadow-lg",
              "data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)]",
              VARIANT_CLASSES[toast.variant],
            )}
          >
            <RadixToast.Title className="text-sm font-medium text-fg">{toast.title}</RadixToast.Title>
            {toast.description && (
              <RadixToast.Description className="mt-1 text-sm text-fg-muted">
                {toast.description}
              </RadixToast.Description>
            )}
            <RadixToast.Close
              aria-label="Dispensar"
              className="absolute right-2 top-2 text-fg-muted hover:text-fg"
            >
              ✕
            </RadixToast.Close>
          </RadixToast.Root>
        ))}
        <RadixToast.Viewport className="fixed bottom-4 right-4 z-50 flex w-96 max-w-full flex-col gap-2" />
      </RadixToast.Provider>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
