## 1. Route reorganization

- [ ] 1.1 Move `apps/web/app/{login,venues,products,resources}` and the existing `page.tsx`/its content under a new `apps/web/app/admin/` folder, and verify `/admin/login`, `/admin/venues`, `/admin/products`, `/admin/resources` render the previously-existing pages
- [ ] 1.2 Add `apps/web/app/admin/layout.tsx` for admin-specific chrome and verify admin pages still render correctly under it
- [ ] 1.3 Update any internal links/navigation referencing the old unprefixed admin paths to their `/admin/*` equivalents, and verify no broken internal links remain (grep for old paths)

## 2. Marketing route scaffold

- [ ] 2.1 Create `apps/web/app/(marketing)/layout.tsx` for public marketing chrome, and verify it does not inherit admin layout
- [ ] 2.2 Create `apps/web/app/(marketing)/page.tsx` at `/` and `apps/web/app/(marketing)/sobre/page.tsx` at `/sobre`, and verify both routes render with distinct content

## 3. Landing page sections

- [ ] 3.1 Implement Hero section (headline, subheadline, primary CTA) and verify it renders on `/`
- [ ] 3.2 Implement Hero animation depicting the simplified platform flow mockup (offer -> checkout -> QR -> access granted) and verify it renders and plays on `/`
- [ ] 3.3 Implement "Como Funciona" section and verify it renders on `/`
- [ ] 3.4 Implement "Diferencial" section covering full-transaction control, capacity as single source of truth, and modular/API-first/multi-tenant positioning, and verify it renders on `/`
- [ ] 3.5 Implement FAQ section and verify it renders on `/`
- [ ] 3.6 Implement final CTA section and verify it renders on `/`

## 4. Institutional page

- [ ] 4.1 Implement institutional page content at `/sobre` and verify it renders

## 5. Lead capture backend

- [ ] 5.1 Add Postgres migration for a `leads` table (establishment name, email, business type, submitted-at timestamp) and verify migration applies cleanly
- [ ] 5.2 Implement lead submission endpoint in `apps/backend` with required-field and email-format validation, and verify unit/integration tests cover valid submission, missing-field rejection, and malformed-email rejection
- [ ] 5.3 Verify lead submissions are stored without any organization/tenant identifier (no foreign key to tenant tables)

## 6. Lead capture frontend integration

- [ ] 6.1 Wire the Hero and final CTA forms to the lead submission endpoint, and verify a successful submission and a validation-error submission both surface correct UI feedback

## 7. Verification

- [ ] 7.1 Run through the full landing page top-to-bottom (Hero animation, Como Funciona, Diferencial, FAQ, CTA) and confirm all sections render and the CTA persists a lead end-to-end
- [ ] 7.2 Confirm `/admin/*` routes work and old unprefixed admin paths no longer serve the admin app
