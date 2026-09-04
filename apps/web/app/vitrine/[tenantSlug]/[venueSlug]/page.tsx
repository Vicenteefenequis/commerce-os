import { permanentRedirect } from "next/navigation";

/**
 * Legacy showcase URL (spec: storefront/showcase - "Legacy showcase URL
 * redirects to the purchase page"). The showcase profile now renders as
 * part of /loja/[tenantSlug]/[venueSlug], so previously shared /vitrine
 * links keep working via a permanent redirect instead of their own page.
 */
export default async function VitrinePage({
  params,
}: {
  params: Promise<{ tenantSlug: string; venueSlug: string }>;
}) {
  const { tenantSlug, venueSlug } = await params;
  permanentRedirect(`/loja/${tenantSlug}/${venueSlug}`);
}
