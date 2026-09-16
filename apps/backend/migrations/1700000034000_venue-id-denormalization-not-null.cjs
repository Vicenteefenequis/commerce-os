/* eslint-disable @typescript-eslint/no-var-requires */
exports.shorthands = undefined;

/**
 * openspec change add-venue-scoped-user-roles, design.md Migration Plan:
 * tightens venue_id to NOT NULL now that the backfill migration has given
 * every existing row a value, and creation now always supplies one
 * (task 1.3).
 */
const TABLES = [
  "product_variants",
  "resource_capacity_periods",
  "resource_capacity_commitments",
  "reservations",
  "order_lines",
  "order_status_history",
  "entitlements",
  "tickets",
];

exports.up = (pgm) => {
  for (const table of TABLES) {
    pgm.alterColumn(table, "venue_id", { notNull: true });
  }
};

exports.down = (pgm) => {
  for (const table of TABLES) {
    pgm.alterColumn(table, "venue_id", { notNull: false });
  }
};
