/* eslint-disable @typescript-eslint/no-var-requires */
exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable("resources", {
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
    default_capacity: { type: "integer", notNull: true },
    hard_capacity: { type: "boolean", notNull: true, default: false },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
    updated_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });
  pgm.createIndex("resources", "tenant_id");
  pgm.createIndex("resources", "venue_id");
  pgm.addConstraint("resources", "resources_default_capacity_non_negative", {
    check: "default_capacity >= 0",
  });

  pgm.createTable("resource_capacity_periods", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    tenant_id: {
      type: "uuid",
      notNull: true,
      references: "organizations",
      onDelete: "cascade",
    },
    resource_id: {
      type: "uuid",
      notNull: true,
      references: "resources",
      onDelete: "cascade",
    },
    period: { type: "date", notNull: true },
    capacity: { type: "integer", notNull: true },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
    updated_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });
  pgm.createIndex("resource_capacity_periods", "tenant_id");
  pgm.addConstraint("resource_capacity_periods", "resource_capacity_periods_unique", {
    unique: ["resource_id", "period"],
  });
  pgm.addConstraint("resource_capacity_periods", "resource_capacity_periods_capacity_non_negative", {
    check: "capacity >= 0",
  });

  // Append-only commitment ledger (design.md D2): available capacity is
  // derived by summing committed rows rather than mutating a counter, so
  // it stays correct and auditable under concurrent/duplicate requests.
  // No producer writes here yet in this change (design.md Non-Goals) -
  // CommitCapacityUseCase exists for test/verification purposes only
  // until Reservation lands.
  pgm.createTable("resource_capacity_commitments", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    tenant_id: {
      type: "uuid",
      notNull: true,
      references: "organizations",
      onDelete: "cascade",
    },
    resource_id: {
      type: "uuid",
      notNull: true,
      references: "resources",
      onDelete: "cascade",
    },
    period: { type: "date", notNull: true },
    amount: { type: "integer", notNull: true },
    status: { type: "text", notNull: true },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });
  pgm.createIndex("resource_capacity_commitments", "tenant_id");
  pgm.createIndex("resource_capacity_commitments", ["resource_id", "period"]);
  pgm.addConstraint("resource_capacity_commitments", "resource_capacity_commitments_amount_positive", {
    check: "amount > 0",
  });
  pgm.addConstraint("resource_capacity_commitments", "resource_capacity_commitments_status_valid", {
    check: "status IN ('held', 'consumed', 'released')",
  });
};

exports.down = (pgm) => {
  pgm.dropTable("resource_capacity_commitments");
  pgm.dropTable("resource_capacity_periods");
  pgm.dropTable("resources");
};
