import { type ReactNode } from "react";
import { Button } from "@/components/ui/button";

export interface ListPageLayoutProps {
  title: string;
  description?: string;
  createLabel: string;
  onCreate: () => void;
  /** Optional second header action (e.g. a distinct create flow), rendered next to the primary one. Omitted from the empty state, which only offers the primary action. */
  secondaryAction?: { label: string; onClick: () => void };
  /** True when there are zero records; shows the empty state instead of `children`. */
  isEmpty: boolean;
  emptyStateDescription?: string;
  children: ReactNode;
}

/**
 * spec: admin/design-system - CRUD list layout pattern. A resource list
 * screen composes its table inside this shell and gets the empty state and
 * create-action placement for free, rather than re-implementing them.
 */
export function ListPageLayout({
  title,
  description,
  createLabel,
  onCreate,
  secondaryAction,
  isEmpty,
  emptyStateDescription,
  children,
}: ListPageLayoutProps): ReactNode {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-fg">{title}</h1>
          {description && <p className="mt-1 text-sm text-fg-muted">{description}</p>}
        </div>
        <div className="flex items-center gap-3">
          {secondaryAction && (
            <Button variant="secondary" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
          <Button onClick={onCreate}>{createLabel}</Button>
        </div>
      </div>

      {isEmpty ? (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-border-strong px-6 py-16 text-center">
          <p className="text-sm text-fg-muted">
            {emptyStateDescription ?? "Nenhum registro encontrado."}
          </p>
          <Button variant="secondary" onClick={onCreate}>
            {createLabel}
          </Button>
        </div>
      ) : (
        children
      )}
    </div>
  );
}
