/* eslint-disable @typescript-eslint/no-var-requires */
exports.shorthands = undefined;

/**
 * expand-storefront-discovery-grid - Venue location coordinates
 * (spec: foundation/venue - "Venue location coordinates are owner-editable")
 * and Organization verification flag (spec: foundation/organization -
 * "Organization verification is platform-admin-controlled"). Additive and
 * nullable/defaulted only - existing rows are unaffected.
 */
exports.up = (pgm) => {
  pgm.addColumn("venues", {
    latitude: { type: "double precision" },
    longitude: { type: "double precision" },
  });

  pgm.addColumn("organizations", {
    verified: { type: "boolean", notNull: true, default: false },
  });
};

exports.down = (pgm) => {
  pgm.dropColumn("venues", ["latitude", "longitude"]);
  pgm.dropColumn("organizations", ["verified"]);
};
