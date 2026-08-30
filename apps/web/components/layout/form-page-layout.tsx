import { type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { FormFieldErrorsProvider } from "./form-field-errors";

export interface FormPageLayoutProps {
  title: string;
  description?: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  /** True while the submit request is in flight (spec: In-progress action disables duplicate submission). */
  isSubmitting?: boolean;
  /** field name -> error message. Automatically surfaced next to any Input/Select with a matching `name`. */
  fieldErrors?: Record<string, string>;
  children: ReactNode;
}

/**
 * spec: admin/design-system - CRUD form layout pattern. A resource
 * create/edit screen composes its fields inside this shell and gets
 * field-level error wiring and submit/cancel state handling for free.
 */
export function FormPageLayout({
  title,
  description,
  onSubmit,
  onCancel,
  submitLabel = "Salvar",
  cancelLabel = "Cancelar",
  isSubmitting = false,
  fieldErrors = {},
  children,
}: FormPageLayoutProps): ReactNode {
  return (
    <FormFieldErrorsProvider value={fieldErrors}>
      <form onSubmit={onSubmit} className="flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-semibold text-fg">{title}</h1>
          {description && <p className="mt-1 text-sm text-fg-muted">{description}</p>}
        </div>

        <div className="flex flex-col gap-4">{children}</div>

        <div className="flex items-center gap-3">
          <Button type="submit" isLoading={isSubmitting}>
            {submitLabel}
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
            {cancelLabel}
          </Button>
        </div>
      </form>
    </FormFieldErrorsProvider>
  );
}
