## Context

`capacity/resource` already models available capacity, holds, releases, and consumption, but has no concept of "someone waiting for capacity." `communication/ticket-delivery` already has a swappable email-provider pattern with recorded outcomes that don't block the underlying domain operation on failure — this change reuses that pattern rather than inventing a second notification mechanism. See `openspec/specs/capacity/resource`, `communication/ticket-delivery`, `storefront/showcase` for what this plugs into.

## Goals / Non-Goals

**Goals:**
- Let a consumer register interest (email only) in a specific sold-out offer, at most once.
- Notify waitlisted entries, in join order, when capacity frees up — up to the number of newly freed units — without guaranteeing them a purchase.

**Non-Goals:**
- Reserving or holding capacity for a notified entry — first-come-first-served at checkout applies identically to everyone, notified or not. Building a reservation-on-notify mechanism is real added complexity (a new hold type, an expiry window, fairness against non-waitlisted buyers) not justified by what the design actually shows (a "notify me" affordance, not a "guaranteed spot" one).
- SMS/push channels — email only, matching the one delivery mechanism this system already has.
- A "my waitlists" consumer view — the consumer has no account to view it from; the only touchpoint is the notification email itself.

## Decisions

### D1: Notification triggers on "capacity newly available," detected at the points capacity increases
Capacity increases in exactly two places today: a `held` commitment being released (`capacity/resource`'s "Commitment release frees capacity"), and a capacity override being raised. Both call sites, after completing their existing effect, check whether the Resource/period's available capacity moved from zero to positive; if so, they trigger waitlist notification for offers (Products) whose variants reference that Resource/period. This piggybacks on existing capacity-mutation code paths rather than polling.

### D2: Notification order is join order (FIFO), capped by newly-available units
If 3 units just freed and 10 people are waitlisted for that offer, the first 3 (by `joinedAt`) are notified. This is the simplest fair rule and matches the design's implied "you're in a queue" framing ("lista de espera") without needing a priority model.

### D3: A notified entry is terminal — no re-notification
Once `notifiedAt` is set, that entry is done, even if capacity later drops back to zero and frees again. Re-notifying on every fluctuation risks spamming a consumer who already got their one signal and either bought or didn't; a consumer who still wants in after missing the window can simply join the waitlist again (a repeat join by the same email is allowed once the prior entry has been notified — see spec's "at most once per offer" requirement, which applies to *un-notified* entries).

### D4: One un-notified entry per (offer, email)
Prevents duplicate notification spam for the same person; joining again with the same email while an un-notified entry already exists is a no-op (idempotent), not an error, so a consumer who taps "join" twice by accident isn't confused by a failure message.

## Risks / Trade-offs

- [Risk] No reservation-on-notify means a notified consumer can still lose the spot to someone else before they check out → Mitigation: accepted per Non-Goals — this matches the design's plain "notify me" framing, not a guarantee; if this proves frustrating in practice, a reservation window is a natural, separate follow-up change.
- [Risk] Piggybacking notification checks onto capacity-mutation code paths (D1) adds synchronous work to those paths → Mitigation: acceptable at expected volume (waitlist lookups scoped to one Resource/period); revisit with an async job queue if it becomes measurably slow.
