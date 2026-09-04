/* eslint-disable @typescript-eslint/no-var-requires */
exports.shorthands = undefined;

/**
 * add-venue-showcase-and-search - Venue profile fields for the public
 * showcase page and discovery search (spec: foundation/venue - "Venue
 * profile fields are owner-editable", "Venue publish toggle is
 * owner-controlled"). Additive and nullable/defaulted only - existing
 * Venues start unpublished with empty profiles (design.md - "Migration
 * Plan").
 */
exports.up = (pgm) => {
  pgm.addColumn("venues", {
    description: { type: "text" },
    address: { type: "text" },
    city: { type: "text" },
    category: { type: "text" },
    cover_photo_url: { type: "text" },
    published: { type: "boolean", notNull: true, default: false },
  });

  pgm.createIndex("venues", ["city"]);
  pgm.createIndex("venues", ["category"]);
};

exports.down = (pgm) => {
  pgm.dropColumn("venues", [
    "description",
    "address",
    "city",
    "category",
    "cover_photo_url",
    "published",
  ]);
};
