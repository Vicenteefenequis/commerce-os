import { CheckoutDetailsForm } from "./checkout-details-form";
import type { CartPayload } from "./cart-payload";

/**
 * Buyer-details step (spec: payments/payment - "Payment page collects
 * buyer identification before payment"). Reached from the storefront cart
 * step carrying the cart selection in the `cart` query param (design.md -
 * "Order creation moves to the payment step"); no Order exists yet.
 */
export default async function CheckoutDetailsPage({
  searchParams,
}: {
  searchParams: Promise<{ cart?: string }>;
}) {
  const { cart } = await searchParams;

  let cartPayload: CartPayload | undefined;
  if (cart) {
    try {
      cartPayload = JSON.parse(cart) as CartPayload;
    } catch {
      cartPayload = undefined;
    }
  }

  if (!cartPayload || !cartPayload.tenantId || !cartPayload.venueId || cartPayload.lines.length === 0) {
    return (
      <main className="mx-auto max-w-sm p-8">
        <p className="text-sm text-danger">Carrinho inválido ou expirado.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-sm p-8">
      <CheckoutDetailsForm cart={cartPayload} />
    </main>
  );
}
