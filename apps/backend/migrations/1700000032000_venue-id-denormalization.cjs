/* eslint-disable @typescript-eslint/no-var-requires */
exports.shorthands = undefined;

/**
 * openspec change add-venue-scoped-user-roles, design.md D3: only
 * `venues`, `products`, `resources`, `orders`, and `scan_attempts` carry
 * `venue_id` directly. These eight tables only reach a Venue transitively
 * (e.g. tickets -> entitlements -> orders.venue_id, two joins deep).
 * Denormalizing venue_id onto each - the same treatment `tenant_id`
 * already gets everywhere despite being reachable via `organizations` -
 * lets Venue-scoped RLS use a plain column check instead of a per-table
 * join subquery. Added nullable first; the next migration backfills
 * existing rows before a following migration tightens these to NOT NULL.
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
    pgm.addColumn(table, {
      venue_id: {
        type: "uuid",
        references: "venues",
        onDelete: "cascade",
      },
    });
    pgm.createIndex(table, "venue_id");
  }
};

exports.down = (pgm) => {
  for (const table of TABLES) {
    pgm.dropColumn(table, "venue_id");
  }
};
