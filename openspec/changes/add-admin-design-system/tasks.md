## 1. Tooling setup

- [ ] 1.1 Add `tailwindcss`, `postcss`, `autoprefixer` to `apps/web` and create `tailwind.config.ts` + `postcss.config.js`, and verify `pnpm --filter web build` succeeds with Tailwind processing enabled
- [ ] 1.2 Add `@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-select`, `@radix-ui/react-tabs`, `@radix-ui/react-toast` to `apps/web` and verify they resolve in a throwaway import
- [ ] 1.3 Create `apps/web/app/globals.css` with the token layer (CSS custom properties for color, typography, spacing, radius) plus a `prefers-color-scheme: dark` block redefining the color tokens, and verify it's imported in `app/layout.tsx`
- [ ] 1.4 Wire `tailwind.config.ts` theme (`colors`, `borderRadius`, `fontFamily`) to read from the CSS custom properties defined in 1.3 (design.md D2), and verify a test utility class (e.g. `bg-primary`) renders the token color

## 2. Base components

- [ ] 2.1 Implement `Button` (`components/ui/button.tsx`) with `primary`/`secondary`/`destructive`/`ghost` variants and a disabled/loading state, and verify it renders all variants in a throwaway preview
- [ ] 2.2 Implement `Input` and `Select` (`components/ui/input.tsx`, `components/ui/select.tsx`, the latter on `@radix-ui/react-select`) with a label, error-message slot, and disabled state, and verify keyboard operability (Tab focuses it, Select opens with Enter/Space and closes with Escape)
- [ ] 2.3 Implement `Dialog` (`components/ui/dialog.tsx` on `@radix-ui/react-dialog`) and verify focus is trapped while open, Escape closes it, and focus returns to the trigger on close (spec: admin/design-system - Dialog is keyboard-operable)
- [ ] 2.4 Implement `Table` (`components/ui/table.tsx`) with header/row/cell primitives and verify it renders a sample dataset with correct semantic table markup
- [ ] 2.5 Implement `Toast` (`components/ui/toast.tsx` on `@radix-ui/react-toast`) with success/error variants and verify it auto-dismisses and is manually dismissible
- [ ] 2.6 Implement `Badge` and `Card` (`components/ui/badge.tsx`, `components/ui/card.tsx`) and verify they render with the token palette

## 3. Layout patterns

- [ ] 3.1 Implement `ListPageLayout` (`components/layout/list-page-layout.tsx`): title, primary create action, content slot for the table, and a built-in empty state shown when a configurable "isEmpty" condition is true, and verify a throwaway list screen using it shows the empty state with zero records and the table with one
- [ ] 3.2 Implement `FormPageLayout` (`components/layout/form-page-layout.tsx`): title, field content slot, submit/cancel action pair, and a mechanism to surface field-level errors passed in as a `{ field: string }[]` map, and verify a throwaway form screen using it displays a field-level error next to the correct field
- [ ] 3.3 Wire in-progress/disabled state on `FormPageLayout`'s submit action while a passed-in `isSubmitting` flag is true, and verify the submit button is disabled and shows a loading indicator during that state (spec: admin/design-system - In-progress action disables duplicate submission)

## 4. Verification

- [ ] 4.1 Build a temporary internal preview route (e.g. `apps/web/app/_preview/design-system/page.tsx`, not linked from any nav) exercising every base component and both layout patterns together, confirm it renders correctly in both light and dark OS theme settings, then remove the throwaway pieces used only for isolated component checks in tasks 2.x/3.x once this consolidated preview covers them
- [ ] 4.2 Run `pnpm --filter web lint` and `pnpm --filter web build` and verify both succeed with no new warnings
- [ ] 4.3 Manually verify keyboard-only operation (no mouse) of the Dialog, Select, and both layout patterns end-to-end in the preview route from 4.1
