/* eslint-disable @typescript-eslint/no-var-requires */
exports.shorthands = undefined;

/**
 * spec: commerce/order - "Order records its sales channel"; payments/payment
 * - "Supported payment methods" (adds cash). design.md - Migration Plan:
 * backfill every existing Order to 'storefront' (the only channel that
 * existed before this change) in the same migration that adds the column.
 */
exports.up = (pgm) => {
  pgm.addColumn("orders", {
    channel: { type: "text", notNull: true, default: "storefront" },
  });
  pgm.addConstraint("orders", "orders_channel_valid", {
    check: "channel IN ('storefront', 'counter')",
  });

  pgm.dropConstraint("payments", "payments_method_valid");
  pgm.addConstraint("payments", "payments_method_valid", {
    check: "method IN ('card', 'pix', 'cash')",
  });
};

exports.down = (pgm) => {
  pgm.dropConstraint("payments", "payments_method_valid");
  pgm.addConstraint("payments", "payments_method_valid", {
    check: "method IN ('card', 'pix')",
  });

  pgm.dropConstraint("orders", "orders_channel_valid");
  pgm.dropColumn("orders", "channel");
};
