/* eslint-disable @typescript-eslint/no-var-requires */
exports.shorthands = undefined;

/**
 * spec: commerce/checkout - "Checkout captures the buyer's identity";
 * commerce/order - "Order snapshots its purchasing Customer". Backfills a
 * placeholder Customer per tenant for any pre-existing Order rows (e.g. a
 * dev/test database seeded before this change) before making the column
 * required, since Postgres cannot add a NOT NULL column with no default
 * to a non-empty table.
 */
exports.up = (pgm) => {
  pgm.addColumn("orders", {
    customer_id: {
      type: "uuid",
      references: "customers",
      onDelete: "restrict",
    },
  });

  pgm.sql(`
    INSERT INTO customers (tenant_id, email, name)
    SELECT DISTINCT tenant_id, 'unknown+' || tenant_id || '@example.invalid', 'Cliente desconhecido'
    FROM orders
    WHERE customer_id IS NULL
    ON CONFLICT DO NOTHING;
  `);
  pgm.sql(`
    UPDATE orders
    SET customer_id = customers.id
    FROM customers
    WHERE orders.customer_id IS NULL
      AND customers.tenant_id = orders.tenant_id
      AND customers.email = 'unknown+' || orders.tenant_id || '@example.invalid';
  `);

  pgm.alterColumn("orders", "customer_id", { notNull: true });
  pgm.createIndex("orders", "customer_id");
};

exports.down = (pgm) => {
  pgm.dropColumn("orders", "customer_id");
};
