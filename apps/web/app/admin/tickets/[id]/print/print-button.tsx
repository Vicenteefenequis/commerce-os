"use client";

import { Button } from "@/components/ui/button";

/** Triggers the browser's own print dialog - hidden from the printed output itself via the `print:hidden` wrapper in page.tsx. */
export function PrintButton() {
  return (
    <Button type="button" onClick={() => window.print()}>
      Imprimir
    </Button>
  );
}
