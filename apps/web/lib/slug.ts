/**
 * Client-side mirror of the backend's slug generation/validation
 * (apps/backend/src/shared-kernel/slug.ts), used only to auto-suggest a
 * slug as the business types a name and to validate it before submit.
 * The server re-validates format and uniqueness regardless
 * (add-storefront-tenant-landing design.md - "Slug generation & validation").
 */
export function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function isValidSlug(slug: string): boolean {
  return SLUG_PATTERN.test(slug);
}
