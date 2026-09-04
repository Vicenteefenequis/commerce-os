## 1. Offer-scoped cart logic

- [ ] 1.1 Implement the branch condition (dated-offer venue vs. shared-date venue) using the same detection `add-tenant-profile-offers`'s Ofertas tab already uses, and verify a venue without dated offers still shows the unchanged shared visit-date flow (spec: storefront/checkout - Venue without dated offers keeps the shared visit-date flow)
- [ ] 1.2 Implement offer selection state carrying the chosen offer's variants into the panel, and verify selecting a dated offer hides the shared visit-date field (spec: storefront/checkout - Offer-scoped cart selection skips the shared visit-date field)

## 2. Panel component

- [ ] 2.1 Build `OfferCheckoutPanel` (`components/storefront/offer-checkout-panel.tsx`): capacity bar for the offer, `LoteRow` list with single-selection, quantity stepper, price breakdown (subtotal/total, no fee line per design.md D2), primary CTA
- [ ] 2.2 Wire lote selection and quantity changes to recalculate the price breakdown live, and verify total always equals subtotal (spec: storefront/checkout - Offer panel price breakdown reflects only server-chargeable amounts)
- [ ] 2.3 Apply the existing remaining-capacity cap and sold-out-disable logic to lote rows inside the panel, reusing the same check used by the flat variant list (spec: storefront/checkout - Storefront cart prevents selecting more than the available capacity)

## 3. Responsive placement

- [ ] 3.1 Render `OfferCheckoutPanel` as a fixed right-side column on desktop breakpoints, verified to remain visible while the offer list scrolls (spec: storefront/checkout - Offer panel renders as a fixed side panel on desktop and a bottom sheet on mobile)
- [ ] 3.2 Build the mobile sticky mini-bar (price-from + CTA) that opens `OfferCheckoutPanel` in the mobile shell's bottom sheet, and verify it opens/closes via touch and keyboard
- [ ] 3.3 Verify the desktop and mobile presentations use the exact same `OfferCheckoutPanel` component with no divergent logic

## 4. Verification

- [ ] 4.1 Manually verify the full offer-selection-to-panel flow against a seeded offer with two lotes, one near sold out
- [ ] 4.2 Manually verify the pre-existing shared-date flow (a venue without dated offers) is unaffected end to end
- [ ] 4.3 Run `pnpm --filter web lint` and `pnpm --filter web build`, and verify both succeed
