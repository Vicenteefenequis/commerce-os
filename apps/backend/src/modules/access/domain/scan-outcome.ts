/**
 * spec: access/scan - "Scan outcome is classified unambiguously". Every
 * scan resolves to exactly one of these, and the same vocabulary is used
 * by the domain, the persisted ScanAttempt, and the HTTP response body so
 * an operator's screen and the audit trail can never disagree.
 *
 * `wrong_time` and `expired` are both derived from the backing
 * Reservation's period (add-access-control design.md D4): too early vs.
 * too late. Neither is a state of the Entitlement itself.
 */
export type ScanOutcome = "authorized" | "already_used" | "invalid" | "wrong_venue" | "wrong_time" | "expired";
