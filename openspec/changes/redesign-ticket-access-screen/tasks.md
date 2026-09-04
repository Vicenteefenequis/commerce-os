## 1. Backend: display context

- [ ] 1.1 Extend the account-less ticket listing endpoint to include, per Ticket: owning Organization name/slug, offer (Product) name, lote (variant) name, and Order buyer name (spec: ticketing/ticket - Listed ticket includes display context)
- [ ] 1.2 Include the Entitlement's Reservation validity window when present, omitted otherwise (spec: ticketing/ticket - Listed ticket includes a validity window when its Entitlement is Reservation-backed / omits a validity window when not Reservation-backed)
- [ ] 1.3 Verify the extended response still enforces existing tenant/order scoping and payment-status gating unchanged

## 2. Frontend: redesigned ticket view

- [ ] 2.1 Build the tenant identity chip (logo/initial, name, slug) at the top of the ticket card
- [ ] 2.2 Render the large QR with the ticket's code as readable text beneath it
- [ ] 2.3 Render the details block: offer name, lote name, holder (buyer) name, and validity window when present (spec: storefront/ticket-view - Ticket view shows tenant identity and offer details / states its validity window when one exists)
- [ ] 2.4 Render the entry-rule banner using the accurate "consumed on first scan" wording from design.md D1, not the mockup's broader "não reentra" claim (spec: storefront/ticket-view - Ticket view states single-use consumption accurately)
- [ ] 2.5 Add visually reserved, functionally inert "Adicionar à carteira" and "Transferir para outra pessoa" affordances (disabled/"em breve" state per design.md D3) without implementing either
- [ ] 2.6 Verify existing one-at-a-time navigation for multi-ticket Orders still works unchanged

## 3. Verification

- [ ] 3.1 Manually verify the redesigned view for a Reservation-backed ticket (shows validity window) and a non-Reservation-backed ticket (omits it), and for single- and multi-ticket Orders
- [ ] 3.2 Run `pnpm --filter web lint`, `pnpm --filter web build`, and the backend test suite, and verify all succeed
