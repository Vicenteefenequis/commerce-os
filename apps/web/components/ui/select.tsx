"use client";

import { useId, type ReactNode } from "react";
import * as RadixSelect from "@radix-ui/react-select";
import { cn } from "@/lib/cn";
import { useFieldError } from "@/components/layout/form-field-errors";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  label: string;
  options: SelectOption[];
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  name?: string;
}

/**
 * Built on Radix's Select primitive (spec: admin/design-system - Dropdown/select
 * is keyboard-navigable): Radix owns open/close on Enter/Space/Escape,
 * arrow-key navigation between options, and typeahead - this wrapper only
 * adds token-driven styling and the label/error slots.
 */
export function Select({
  label,
  options,
  value,
  onValueChange,
  placeholder = "Selecione...",
  error: errorProp,
  disabled,
  name,
}: SelectProps): ReactNode {
  const triggerId = useId();
  const errorId = `${triggerId}-error`;
  const contextError = useFieldError(name);
  const error = errorProp ?? contextError;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={triggerId} className="text-sm font-medium text-fg">
        {label}
      </label>
      <RadixSelect.Root value={value} onValueChange={onValueChange} disabled={disabled} name={name}>
        <RadixSelect.Trigger
          id={triggerId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            "flex items-center justify-between gap-2 rounded-md border border-border-strong bg-surface px-3 py-2 text-sm text-fg",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
            "disabled:pointer-events-none disabled:opacity-50",
            "data-[placeholder]:text-fg-muted",
            error && "border-danger",
          )}
        >
          <RadixSelect.Value placeholder={placeholder} />
          <RadixSelect.Icon aria-hidden="true">▾</RadixSelect.Icon>
        </RadixSelect.Trigger>
        <RadixSelect.Portal>
          <RadixSelect.Content
            className="overflow-hidden rounded-md border border-border bg-surface-raised shadow-lg"
            position="popper"
            sideOffset={4}
          >
            <RadixSelect.Viewport className="p-1">
              {options.map((option) => (
                <RadixSelect.Item
                  key={option.value}
                  value={option.value}
                  className={cn(
                    "cursor-pointer select-none rounded-sm px-3 py-2 text-sm text-fg outline-none",
                    "data-[highlighted]:bg-bg-subtle data-[state=checked]:font-medium",
                  )}
                >
                  <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
                </RadixSelect.Item>
              ))}
            </RadixSelect.Viewport>
          </RadixSelect.Content>
        </RadixSelect.Portal>
      </RadixSelect.Root>
      {error && (
        <p id={errorId} className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
