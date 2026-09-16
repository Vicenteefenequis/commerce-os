/* eslint-disable @typescript-eslint/no-var-requires */
exports.shorthands = undefined;

/**
 * openspec change add-venue-scoped-user-roles, design.md D3/Migration
 * Plan: backfills the venue_id columns added in the previous migration
 * from each table's owning parent. `tickets` is backfilled from
 * `entitlements` after `entitlements` itself is backfilled (both within
 * this same migration), since `entitlements.venue_id` is not yet reliable
 * until this migration runs.
 */
exports.up = (pgm) => {
  pgm.sql(`
    UPDATE product_variants pv
    SET venue_id = p.venue_id
    FROM products p
    WHERE pv.product_id = p.id;
  `);

  pgm.sql(`
    UPDATE resource_capacity_periods rcp
    SET venue_id = r.venue_id
    FROM resources r
    WHERE rcp.resource_id = r.id;
  `);

  pgm.sql(`
    UPDATE resource_capacity_commitments rcc
    SET venue_id = r.venue_id
    FROM resources r
    WHERE rcc.resource_id = r.id;
  `);

  pgm.sql(`
    UPDATE reservations res
    SET venue_id = r.venue_id
    FROM resources r
    WHERE res.resource_id = r.id;
  `);

  pgm.sql(`
    UPDATE order_lines ol
    SET venue_id = o.venue_id
    FROM orders o
    WHERE ol.order_id = o.id;
  `);

  pgm.sql(`
    UPDATE order_status_history osh
    SET venue_id = o.venue_id
    FROM orders o
    WHERE osh.order_id = o.id;
  `);

  pgm.sql(`
    UPDATE entitlements e
    SET venue_id = o.venue_id
    FROM orders o
    WHERE e.order_id = o.id;
  `);

  pgm.sql(`
    UPDATE tickets t
    SET venue_id = e.venue_id
    FROM entitlements e
    WHERE t.entitlement_id = e.id;
  `);
};

// Not meaningfully reversible: down would have to know which venue_id
// values were populated by this backfill vs. supplied afterward.
exports.down = () => {};
