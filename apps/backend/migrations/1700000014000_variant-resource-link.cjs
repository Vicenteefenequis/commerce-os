/* eslint-disable @typescript-eslint/no-var-requires */
exports.shorthands = undefined;

/**
 * spec: catalog/product - "Variant capacity linkage" (design.md: fixed,
 * optional 1:1 link, no per-period variation).
 */
exports.up = (pgm) => {
  pgm.addColumn("product_variants", {
    resource_id: {
      type: "uuid",
      references: "resources",
      onDelete: "set null",
    },
  });
  pgm.createIndex("product_variants", "resource_id");
};

exports.down = (pgm) => {
  pgm.dropColumn("product_variants", "resource_id");
};
