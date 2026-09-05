import { Archivo, JetBrains_Mono } from "next/font/google";
import { PayForm } from "./pay-form";

// Self-hosted the same way apps/web/app/loja/layout.tsx does, so the
// redesigned ticket view's `font-sf-sans`/`font-sf-mono` utilities (which
// read these variables) resolve here without a runtime request to
// fonts.googleapis.com. Harmless for the rest of this page, which doesn't
// reference the sf-* tokens.
const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--sf-font-archivo",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--sf-font-jetbrains-mono",
});

/**
 * Minimal public payment page (design.md - Non-Goals: no cart/browsing/
 * checkout-form UI, only this). Reached via a link carrying the Order's
 * id and owning tenant - both already required to call
 * POST /orders/:id/payment-intent (spec: commerce/checkout's own
 * account-less design).
 */
export default async function PayPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ tenantId?: string }>;
}) {
  const { orderId } = await params;
  const { tenantId } = await searchParams;

  if (!tenantId) {
    return (
      <main className="mx-auto max-w-sm p-8">
        <p className="text-sm text-danger">Link de pagamento inválido.</p>
      </main>
    );
  }

  return (
    <main className={`mx-auto max-w-sm p-8 ${archivo.variable} ${jetBrainsMono.variable}`}>
      <PayForm orderId={orderId} tenantId={tenantId} />
    </main>
  );
}
