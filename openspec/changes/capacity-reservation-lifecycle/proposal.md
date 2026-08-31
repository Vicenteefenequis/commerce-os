## Why

`capacity/resource` already lets an authorized actor hold capacity (`CommitCapacityUseCase` → a `held` commitment) and defines a `held | consumed | released` status enum, but nothing in the system creates, confirms, expires, or consumes a commitment yet — the use case has no production caller (see its own code comment: "No production caller exists yet... Reservation will call this once specified"). Without an explicit Reservation lifecycle, a customer's capacity hold during checkout can never become a confirmed reservation, never expire back to available capacity if checkout is abandoned, and never be marked consumed at the venue entrance — which blocks Checkout (M2) and Access Control (M5) from having anything to call. This is roadmap milestone M1 (`docs/ROADMAP.md`), a prerequisite for Order/Checkout.

## What Changes

- Add a `Reservation` aggregate with an explicit lifecycle: `pending → confirmed → consumed`, with `pending → expired` and `pending|confirmed → cancelled` side exits (PRD §17, §713-726).
- Creating a Reservation holds capacity via the existing `CommitCapacityUseCase` (`available → held`); rejection (hard capacity exceeded) rejects the Reservation with no capacity consumed.
- Confirming a Reservation (e.g. on payment approval) transitions it to `confirmed` without changing the underlying commitment's `held` status.
- Expiring a Reservation (hold not confirmed within its TTL) or cancelling one releases its commitment (`held → released`), returning the capacity to available.
- Consuming a Reservation (e.g. on access validation) marks its commitment `held → consumed`, permanently retaining the capacity as used.
- Add `releaseCommitment` and `markConsumed` operations to the capacity commitment repository port, and the corresponding requirements to `capacity/resource` describing their effect on available capacity.

## Capabilities

### New Capabilities
- `capacity/reservation`: defines the Reservation aggregate, its explicit lifecycle (pending/confirmed/expired/cancelled/consumed), and how each transition holds, releases, or consumes the underlying resource commitment.

### Modified Capabilities
- `capacity/resource`: adds requirements for releasing a commitment (frees held capacity back to available) and marking a commitment consumed (capacity remains committed permanently, distinct from held).

## Impact

- Affected code: `apps/backend/src/modules/capacity/domain/ports.ts` (new repository port methods), `apps/backend/src/modules/capacity/infrastructure/capacity-commitment-repository.kysely.ts` (implementations), new `reservation` application use cases and a new `reservation.entity.ts` under `apps/backend/src/modules/capacity/domain/`, new `reservation.routes.ts` / `reservation.controller.ts`.
- No new external dependency. Builds entirely on the existing `capacity` module; no other module is touched.
- Does not implement expiry scheduling infrastructure (e.g. a cron/worker) — see design.md for the expiry trigger approach.
