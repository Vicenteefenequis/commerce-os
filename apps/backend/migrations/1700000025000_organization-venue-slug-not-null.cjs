/* eslint-disable @typescript-eslint/no-var-requires */
exports.shorthands = undefined;

/**
 * add-storefront-tenant-landing design.md - "Migration Plan": tightens
 * slug to NOT NULL now that the backfill migration has given every
 * existing row a value, and creation now always supplies one.
 */
exports.up = (pgm) => {
  pgm.alterColumn("organizations", "slug", { notNull: true });
  pgm.alterColumn("venues", "slug", { notNull: true });
};

exports.down = (pgm) => {
  pgm.alterColumn("venues", "slug", { notNull: false });
  pgm.alterColumn("organizations", "slug", { notNull: false });
};
