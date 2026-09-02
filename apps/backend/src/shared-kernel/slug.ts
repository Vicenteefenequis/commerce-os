const COMBINING_DIACRITICS = /[̀-ͯ]/g;

/**
 * add-storefront-tenant-landing design.md - "Slug generation & validation":
 * kebab-case, ASCII-folded (so pt-BR names produce readable public URLs).
 * Used both to suggest a slug from `name` at creation time and to validate
 * a slug supplied by the caller.
 */
export function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(COMBINING_DIACRITICS, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function isValidSlug(slug: string): boolean {
  return SLUG_PATTERN.test(slug);
}
