"use client";

import { createContext, useContext } from "react";

const FormFieldErrorsContext = createContext<Record<string, string>>({});

export const FormFieldErrorsProvider = FormFieldErrorsContext.Provider;

/** Looks up a field-level error by field `name` from the enclosing FormPageLayout, if any. */
export function useFieldError(name: string | undefined): string | undefined {
  const errors = useContext(FormFieldErrorsContext);
  return name ? errors[name] : undefined;
}
