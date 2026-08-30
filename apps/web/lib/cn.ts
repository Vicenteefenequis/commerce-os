type ClassValue = string | false | null | undefined;

/** Joins truthy class name fragments with a single space, skipping falsy ones. */
export function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(" ");
}
