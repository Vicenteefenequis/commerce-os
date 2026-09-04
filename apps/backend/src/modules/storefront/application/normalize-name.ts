const COMBINING_DIACRITICAL_MARKS = /[̀-ͯ]/g;

/**
 * Lowercases and strips diacritics (NFD + combining-mark removal) so that
 * "bar do joao" matches an Organization named "Bar do João".
 * spec: storefront/discovery - "Approximate match tolerates accents and
 * minor differences".
 */
export function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(COMBINING_DIACRITICAL_MARKS, "")
    .toLowerCase()
    .trim();
}
