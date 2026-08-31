## 1. Migration

- [ ] 1.1 Add `reservations` table migration (`id`, `tenant_id`, `resource_id`, `period`, `amount`, `status`, `commitment_id` FK to `resource_capacity_commitments`, `expires_at`, `created_at`, `updated_at`), enrolled in `TENANT_TABLES` RLS; verify migration runs up and down cleanly

## 2. Capacity commitment port: release & consume

- [ ] 2.1 Add `releaseCommitment(tenantId, id)` and `markConsumed(tenantId, id)` to `CapacityCommitmentRepositoryPort`, implemented as guarded single-row updates (`WHERE id = $id AND status = 'held'`), returning whether the update matched a row
- [ ] 2.2 Verify: releasing a `held` commitment updates its status to `released`; releasing a `consumed` or already-`released` commitment is a no-op (matches zero rows)
- [ ] 2.3 Verify: marking a `held` commitment consumed updates its status to `consumed`; marking a `consumed` or `released` commitment is a no-op (matches zero rows)
- [ ] 2.4 Verify: available-capacity calculation excludes `released` commitments and continues to include `consumed` ones (existing `get-available-capacity` behavior, spec: capacity/resource - "Commitment release frees capacity", "Commitment consumption is permanent")

## 3. Reservation domain and use cases

- [ ] 3.1 Add `Reservation` entity (`domain/reservation.entity.ts`) with status `pending | confirmed | expired | cancelled | consumed`
- [ ] 3.2 Add `ReservationRepositoryPort` (create, findById, guarded status-transition update) to `domain/ports.ts`
- [ ] 3.3 Add `CreateReservationUseCase`: calls `CommitCapacityUseCase` to hold capacity, then creates the `pending` Reservation referencing the resulting `commitment_id`; on `CapacityExceededError` from the hold, creates no Reservation; verify both the success and rejection paths with a test
- [ ] 3.4 Add `ConfirmReservationUseCase`: guarded `pending → confirmed` transition, no commitment change; verify confirming a non-`pending` Reservation is rejected (test)
- [ ] 3.5 Add `ExpireReservationUseCase`: guarded `pending → expired` transition plus `releaseCommitment` on its commitment, in the same transaction; verify expiring frees capacity (test) and that non-`pending` Reservations are rejected
- [ ] 3.6 Add `CancelReservationUseCase`: guarded `pending|confirmed → cancelled` transition plus `releaseCommitment`, in the same transaction; verify cancelling frees capacity (test) and that `consumed`/`expired`/`cancelled` Reservations are rejected
- [ ] 3.7 Add `ConsumeReservationUseCase`: guarded `confirmed → consumed` transition plus `markConsumed` on its commitment, in the same transaction; verify capacity remains committed after consumption (test) and that a Reservation can only be consumed once (test)
- [ ] 3.8 Publish `reservation.created` / `reservation.confirmed` / `reservation.expired` / `reservation.cancelled` / `reservation.consumed` domain events via `OutboxEventPublisher` in each use case's transaction

## 4. Audit

- [ ] 4.1 Add audit consumer handlers for each `reservation.*` event in `registerAuditConsumers`, recording actor, reservation id, and resulting status; verify an audit entry is written for a cancellation (test, spec: capacity/reservation - "Reservation state transitions are audited")

## 5. Infrastructure: routes

- [ ] 5.1 Add `KyselyReservationRepository` implementing `ReservationRepositoryPort`
- [ ] 5.2 Add `reservation.controller.ts` and `reservation.routes.ts`: `POST /reservations` (create), `POST /reservations/:id/confirm`, `POST /reservations/:id/expire`, `POST /reservations/:id/cancel`, `POST /reservations/:id/consume`, each behind `requireAuth` + `requirePermission("reservation:manage")` and `txRoute`
- [ ] 5.3 Verify tenant isolation: a request scoped to Organization A cannot read or transition a Reservation belonging to Organization B (test, spec: capacity/reservation - "Reservation is isolated by tenant")

## 6. End-to-end verification

- [ ] 6.1 Walk the full lifecycle in a single integration test: create Reservation (capacity held, reported unavailable) → confirm → consume (capacity still committed, reservation terminal) — verify available capacity at each step
- [ ] 6.2 Walk the expiry/cancellation side exits in an integration test: create Reservation → expire (capacity freed); create another Reservation → confirm → cancel (capacity freed) — verify available capacity is restored in both cases
