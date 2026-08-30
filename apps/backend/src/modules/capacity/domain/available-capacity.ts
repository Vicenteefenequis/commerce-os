/**
 * spec: capacity/resource - "Available capacity calculation",
 * "Available capacity never goes negative". Pure function so it can be
 * unit tested without a database and reused identically by the read path
 * and the commit-time check (design.md D2/D3).
 */
export function calculateAvailableCapacity(configuredCapacity: number, committed: number): number {
  return Math.max(0, configuredCapacity - committed);
}
