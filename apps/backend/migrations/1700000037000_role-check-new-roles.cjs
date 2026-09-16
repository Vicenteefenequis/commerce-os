/* eslint-disable @typescript-eslint/no-var-requires */
exports.shorthands = undefined;

/**
 * openspec change add-venue-scoped-user-roles, design.md D1: swaps
 * `role_assignments`'s CHECK constraint from the old seven roles to the
 * new four, now that the previous migration has remapped/archived every
 * pre-existing row so none of them still hold a value outside this set.
 */
exports.up = (pgm) => {
  pgm.dropConstraint("role_assignments", "role_assignments_role_check");
  pgm.addConstraint("role_assignments", "role_assignments_role_check", {
    check: "role in ('admin', 'gerente', 'vendedor', 'validador')",
  });
};

exports.down = (pgm) => {
  pgm.dropConstraint("role_assignments", "role_assignments_role_check");
  pgm.addConstraint("role_assignments", "role_assignments_role_check", {
    check: "role in ('owner','admin','finance','sales','operator','access_operator','read_only')",
  });
};
