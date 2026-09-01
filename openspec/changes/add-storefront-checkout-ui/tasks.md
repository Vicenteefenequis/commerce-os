## 1. Storefront checkout UI

- [ ] 1.1 Add `apps/web/app/loja/[tenantId]/[venueId]/page.tsx` server-loading venue + product list from `add-storefront-catalog`'s public API; verify initial HTML contains the product list with no client-side fetch for it
- [ ] 1.2 Add the cart/buyer-details Client Component leaf (product+quantity selection, buyer email/name form, order summary with total); verify selecting items and quantities updates the displayed total
- [ ] 1.3 Wire submission: `POST /checkout` → `POST /orders/:id/submit-for-payment` → redirect to `/pay/[orderId]?tenantId=`; verify a full run lands on the existing payment page with the correct Order
- [ ] 1.4 Surface checkout failures (e.g. capacity exceeded, invalid buyer details) without clearing the cart or entered buyer details; verify by forcing a capacity failure and confirming the cart survives
- [ ] 1.5 Handle the empty-catalog case (no visible/available products) with a clear message instead of a blank page

## 2. Validation

- [ ] 2.1 Manually walk the full consumer path end to end on seeded data: `/loja/...` → select product → buy → land on `/pay/[orderId]`
- [ ] 2.2 Update `docs/ROADMAP.md`: mark M8 concluded, reference this change
