/* eslint-disable @typescript-eslint/no-var-requires */
exports.shorthands = undefined;

/**
 * spec: ticketing/entitlement - "Entitlement is consumed exactly once via
 * Access Control". Widens the status check added by 1700000019000_ticketing
 * (which deliberately allowed only `issued` until Access Control landed) so
 * an Entitlement can reach the terminal `consumed` state. The transition
 * itself is a guarded `UPDATE ... WHERE status = 'issued'`
 * (add-access-control design.md D5), so no new column or lock table is
 * needed - only room in the constraint for the new value.
 */
exports.up = (pgm) => {
  pgm.dropConstraint("entitlements", "entitlements_status_valid");
  pgm.addConstraint("entitlements", "entitlements_status_valid", {
    check: "status IN ('issued', 'consumed')",
  });
};

exports.down = (pgm) => {
  pgm.sql(`UPDATE entitlements SET status = 'issued' WHERE status = 'consumed';`);
  pgm.dropConstraint("entitlements", "entitlements_status_valid");
  pgm.addConstraint("entitlements", "entitlements_status_valid", {
    check: "status IN ('issued')",
  });
};
