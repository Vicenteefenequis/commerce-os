/* eslint-disable @typescript-eslint/no-var-requires */
exports.shorthands = undefined;

/**
 * add-storefront-tenant-landing design.md - "Slug generation & validation":
 * public storefront navigation needs a human-readable identifier for
 * Organization and Venue. Added nullable first so existing rows can be
 * backfilled (see the following migration) before NOT NULL is enforced.
 */
exports.up = (pgm) => {
  pgm.addColumn("organizations", {
    slug: { type: "text" },
  });
  pgm.addConstraint("organizations", "organizations_slug_unique", {
    unique: "slug",
  });

  pgm.addColumn("venues", {
    slug: { type: "text" },
  });
  pgm.addConstraint("venues", "venues_tenant_id_slug_unique", {
    unique: ["tenant_id", "slug"],
  });
};

exports.down = (pgm) => {
  pgm.dropConstraint("venues", "venues_tenant_id_slug_unique");
  pgm.dropColumn("venues", "slug");

  pgm.dropConstraint("organizations", "organizations_slug_unique");
  pgm.dropColumn("organizations", "slug");
};
