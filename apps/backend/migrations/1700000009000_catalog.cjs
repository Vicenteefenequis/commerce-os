/* eslint-disable @typescript-eslint/no-var-requires */
exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable("products", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    tenant_id: {
      type: "uuid",
      notNull: true,
      references: "organizations",
      onDelete: "cascade",
    },
    venue_id: {
      type: "uuid",
      notNull: true,
      references: "venues",
      onDelete: "cascade",
    },
    name: { type: "text", notNull: true },
    available_from: { type: "timestamptz" },
    available_until: { type: "timestamptz" },
    channels: { type: "text[]", notNull: true, default: pgm.func("'{}'::text[]") },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
    updated_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });
  pgm.createIndex("products", "tenant_id");
  pgm.createIndex("products", "venue_id");

  pgm.createTable("product_variants", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    tenant_id: {
      type: "uuid",
      notNull: true,
      references: "organizations",
      onDelete: "cascade",
    },
    product_id: {
      type: "uuid",
      notNull: true,
      references: "products",
      onDelete: "cascade",
    },
    name: { type: "text", notNull: true },
    price_cents: { type: "integer", notNull: true },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
    updated_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });
  pgm.createIndex("product_variants", "tenant_id");
  pgm.createIndex("product_variants", "product_id");

  pgm.addConstraint("product_variants", "product_variants_price_positive", {
    check: "price_cents >= 0",
  });
};

exports.down = (pgm) => {
  pgm.dropTable("product_variants");
  pgm.dropTable("products");
};
