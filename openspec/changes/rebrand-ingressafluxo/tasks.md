## 1. Logo component and favicon

- [x] 1.1 Create `apps/web/components/brand/logo.tsx` implementing the icon+wordmark markup from design.md D1, and verify it renders correctly in isolation (e.g. a quick page render) with both a light and dark surrounding text color
- [x] 1.2 Add `apps/web/app/icon.svg` using the flat-color icon geometry from design.md D2, and verify the browser tab shows the new icon when running the app locally
- [x] 1.3 Update `apps/web/app/layout.tsx` `metadata.title`/`metadata.description` from "Commerce OS" to "Ingressafluxo", and verify the rendered `<title>` tag reflects the change

## 2. Replace text with the Logo component

- [x] 2.1 Update `apps/web/components/marketing/site-header.tsx` to render `<Logo />` instead of the "Commerce OS" text link, and verify it renders at the top of `/`
- [x] 2.2 Update `apps/web/components/marketing/site-footer.tsx` copyright line to use "Ingressafluxo" (text is sufficient here per design.md D3; icon optional), and verify it renders at the bottom of `/`
- [x] 2.3 Update `apps/web/components/layout/admin-nav-client.tsx` to render `<Logo />` instead of the "Commerce OS" text span, and verify it renders in the admin nav after logging in
- [x] 2.4 Update `apps/web/components/layout/platform-nav.tsx` to render `<Logo />` (keeping the "· Plataforma" suffix as adjacent text) instead of the "Commerce OS · Plataforma" text span, and verify it renders in the platform console nav

## 3. Remaining text occurrences

- [x] 3.1 Update `apps/web/app/(marketing)/page.tsx` metadata title from "Commerce OS — ..." to "Ingressafluxo — ...", and verify the homepage `<title>` reflects it
- [x] 3.2 Update `apps/web/app/(marketing)/sobre/page.tsx` metadata title/description and body heading/paragraph text ("Sobre o Commerce OS", "O Commerce OS é uma plataforma...") to "Ingressafluxo", and verify `/sobre` renders with no remaining "Commerce OS" text
- [x] 3.3 Update `apps/web/app/admin/page.tsx` heading from "Commerce OS" to "Ingressafluxo", and verify the admin root page renders it
- [x] 3.4 Update `apps/web/components/marketing/differentiator.tsx` copy referencing "Commerce OS" to "Ingressafluxo", and verify the Diferencial section on `/` renders the updated copy
- [x] 3.5 Update `apps/web/components/marketing/hero.tsx` copy referencing "Commerce OS" to "Ingressafluxo", and verify the Hero section on `/` renders the updated copy

## 4. Package rename and final verification

- [x] 4.1 Update the root `package.json` `"name"` field from `"commerce-os"` to `"ingressafluxo"`, and verify `npm install`/the workspace still resolves correctly (no broken internal reference to the old name)
- [x] 4.2 Run a case-insensitive grep for `commerce.?os` across `apps/web` (excluding `.next`/`node_modules`) and resolve every remaining match, and verify the grep returns zero matches when re-run
- [x] 4.3 Run the app locally, visit `/`, `/sobre`, `/admin` (after login), and the platform console, and verify the Ingressafluxo logo/wordmark renders consistently on every surface with no visual regression
- [x] 4.4 Run `openspec validate --change rebrand-ingressafluxo --strict` (with `--store` if applicable) and verify it passes
