/* eslint-disable @typescript-eslint/no-var-requires */
exports.shorthands = undefined;

/**
 * add-tenant-profile-offers - Venue age restriction, owner-editable
 * independently of other profile fields (spec: foundation/venue - "Venue
 * age restriction is owner-editable"). Additive and nullable - existing
 * Venues have no age restriction until an owner sets one.
 */
exports.up = (pgm) => {
  pgm.addColumn("venues", {
    age_restriction: { type: "integer" },
  });
};

exports.down = (pgm) => {
  pgm.dropColumn("venues", ["age_restriction"]);
};
