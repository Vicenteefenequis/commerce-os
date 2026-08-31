import { PayForm } from "./pay-form";

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
    <main className="mx-auto max-w-sm p-8">
      <PayForm orderId={orderId} tenantId={tenantId} />
    </main>
  );
}
