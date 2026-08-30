import { forwardRef, useId, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { useFieldError } from "@/components/layout/form-field-errors";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  /**
   * Field-level validation error, displayed under the input and linked via
   * aria-describedby. If omitted and `name` matches a key in the enclosing
   * FormPageLayout's fieldErrors, that error is used automatically.
   */
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error: errorProp, id, name, className, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const errorId = `${inputId}-error`;
    const contextError = useFieldError(name);
    const error = errorProp ?? contextError;

    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className="text-sm font-medium text-fg">
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          name={name}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            "rounded-md border border-border-strong bg-surface px-3 py-2 text-sm text-fg",
            "placeholder:text-fg-muted",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
            "disabled:pointer-events-none disabled:opacity-50",
            error && "border-danger",
            className,
          )}
          {...props}
        />
        {error && (
          <p id={errorId} className="text-sm text-danger">
            {error}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";
