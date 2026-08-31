## 1. Customer

- [x] 1.1 Add `customers` table (id, tenant_id, email, name, created_at, updated_at) with a unique constraint on (tenant_id, lower(email)); verify migration applies cleanly
- [x] 1.2 Add `Customer` domain entity and `CustomerRepositoryPort` (find-by-email, create, update-name); verify unit tests cover creation and reuse-by-email
- [x] 1.3 Add `ResolveCustomerUseCase` (find by tenant+email, create if absent, update name if changed); verify unit tests for spec "Customer is reused by email within a tenant" and "Same email in different tenants are distinct Customers"
- [x] 1.4 Add tenant-isolated read access to Customer records for authorized staff; verify test for spec "Customer belongs to a single tenant"

## 2. Checkout captures the buyer

- [x] 2.1 Extend `POST /checkout` request schema and `CreateOrderInput` with required `customer: { email, name }`; verify request without it is rejected (spec: commerce/checkout "Checkout without buyer identity is rejected")
- [x] 2.2 Wire `CreateOrderUseCase` to call `ResolveCustomerUseCase` before creating the Order and to set `Order.customerId`; verify integration test creates the Order referencing the resolved Customer (spec: commerce/checkout "Checkout with buyer identity creates the Order with its Customer")
- [x] 2.3 Add `customer_id` column to `orders` table (FK to `customers`, not null); verify migration applies cleanly and existing order tests are updated for the new required field
- [x] 2.4 Verify Order snapshot behavior: changing a Customer's name after order creation does not change what an existing Order returns (spec: commerce/order "Later Customer changes do not affect existing Orders")

## 3. Ticketing domain (Entitlement + Ticket)

- [x] 3.1 Add `entitlements` table (id, tenant_id, order_id, order_line_id, customer_id, status, created_at) and `tickets` table (id, tenant_id, entitlement_id, code unique, issued_at); verify migrations apply cleanly
- [x] 3.2 Add `Entitlement` and `Ticket` domain entities with a one-use, 1:1 Entitlement-to-Ticket invariant; verify unit tests reject a second Ticket for the same Entitlement
- [x] 3.3 Add `IssueEntitlementsForOrderUseCase`: for a paid Order, issues one Entitlement + one Ticket per unit of quantity across all lines, with a unique unguessable Ticket code; verify unit test for spec "Entitlement is issued one per purchased unit" (quantity 3 -> 3 Entitlements/Tickets)
- [x] 3.4 Make issuance idempotent by checking for existing Entitlements for the Order id before inserting, inside the same transaction; verify test simulating the event observed twice issues each unit only once (spec: "Entitlement issuance is not duplicated")
- [x] 3.5 Register an outbox consumer on `order.status_changed` filtered to `toStatus: "paid"` that invokes `IssueEntitlementsForOrderUseCase`, mirroring `audit-outbox-consumer.ts`; verify integration test: Order transition to `paid` results in issued Entitlements/Tickets, and no issuance occurs for `draft`/`awaiting_payment` (spec: "Entitlement issuance is triggered by payment")
- [x] 3.6 Add tenant-isolated read access for Entitlements and Tickets; verify tests for both "belongs to a single tenant" scenarios
- [x] 3.7 Verify Ticket code uniqueness across tenants and that decoding a code yields only an Entitlement reference, no access decision (spec: ticketing/ticket "Ticket code references the Entitlement, not an authorization decision")

## 4. Communication (ticket delivery)

- [x] 4.1 Define `EmailProviderPort` (`send(to, subject, body)`) in a new `communication` module, mirroring `PaymentProviderPort`'s shape; verify the interface compiles against a `NullEmailProvider` test double
- [x] 4.2 Implement `NullEmailProvider` as the wired default: returns a "not configured" result, never throws; verify unit test
- [x] 4.3 Add a delivery-attempt record (tenant_id, order_id, status: sent/failed/not_configured, attempted_at) and `DeliverOrderTicketsUseCase` that sends all of an Order's issued Tickets in one email to its Customer; verify unit tests for spec "Delivery outcome is recorded" (all three outcomes)
- [x] 4.4 Trigger `DeliverOrderTicketsUseCase` from the same issuance flow (3.5) once all of an Order's Tickets are issued; verify integration test for spec "Ticket delivery is attempted on issuance"
- [x] 4.5 Verify a failed or not-configured delivery leaves the Entitlement/Ticket status untouched (spec: "Delivery failure does not affect issuance")

## 5. Wiring and verification

- [x] 5.1 Register the new outbox consumers at startup alongside `registerAuditConsumers()`; verify app boots and consumers are registered
- [x] 5.2 Run full backend test suite and confirm no regression in existing checkout/order/fulfillment tests after the required `customer` field change
- [x] 5.3 Update `docs/ROADMAP.md` M4 entry to reference this change once merged (done at archive time, not here)

## 6. Operational follow-up (outside this change's code)

- [ ] 6.1 Choose and create an account with a real email provider (Resend recommended); document the decision
- [ ] 6.2 Verify a sending domain with the chosen provider and configure the sender address
- [ ] 6.3 Implement and wire a concrete `EmailProviderPort` adapter for the chosen provider, and set its API key via env var (e.g. `RESEND_API_KEY`) — tracked as a future change, not part of this one
