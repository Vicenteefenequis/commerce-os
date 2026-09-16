import type { RoleAssignment } from "./ports.js";

export type VenueScope = string[] | "all";

/**
 * openspec change add-venue-scoped-user-roles, design.md D3: an `admin`
 * assignment (venueId null) makes the whole Identity unrestricted,
 * regardless of any other assignment the user also holds. Otherwise, the
 * scope is every distinct Venue id across the user's assignments (a user
 * can hold e.g. both vendedor and validador for the same Venue, or the
 * same role for different Venues).
 */
export function resolveVenueScope(assignments: RoleAssignment[]): VenueScope {
  if (assignments.some((a) => a.role === "admin")) {
    return "all";
  }
  return [...new Set(assignments.map((a) => a.venueId).filter((id): id is string => id !== null))];
}
