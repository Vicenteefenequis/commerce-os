## 1. Cart-level visit date

- [x] 1.1 In `checkout-cart.tsx`, replace the per-line `period` state with a single cart-level `visitDate` state (defaulted to today via the existing `todayIsoDate()`), and render one date `Input` above the product/ticket list; verify the field is visible and defaulted to today with no ticket selected
- [x] 1.2 Remove the per-line "Data da visita" `Input` rendered inside each variant row; verify no per-line date field remains in the rendered cart
- [x] 1.3 Update `setQuantity` and the `CartLine` shape to drop the per-line `period` field (quantity only); verify changing the cart-level `visitDate` after quantities are set does not reset those quantities

## 2. Checkout submission

- [x] 2.1 Update the `handleSubmit` mapping so every line whose variant has a `resourceId` sends the single cart-level `visitDate` as its `period` (lines without `resourceId` keep sending `period: undefined`, unchanged); verify `submitCheckout` still receives one `period` string per capacity-bound line
- [x] 2.2 Update client-side validation: since `visitDate` always has a value (defaults to today), drop the old "missing period on a selected capacity-bound line" check; verify the existing "no items selected" and "missing name/email" validations still fire correctly

## 3. Verification

- [x] 3.1 Manually run the storefront cart for a venue with a capacity-bound variant and a non-capacity-bound variant: confirm the visit date appears above the list, applies to the capacity-bound ticket's checkout without a per-line date field, and checkout completes through to the payment page (verified against a fresh seeded DB + isolated backend/web dev servers: page renders one shared date field above both variants, and `POST /checkout` succeeds with the shared date on the capacity-bound line and no period on the other)
- [x] 3.2 Run the frontend test suite (`npm run test` in `apps/web` or project equivalent) and confirm no regressions (apps/web has no unit test suite; verified via `tsc --noEmit`, `eslint`, and `next build`, all clean)
