"use server";

import { revalidatePath } from "next/cache";
import { backendFetch } from "@/lib/backend-fetch";

export interface CreateProductActionResult {
  error?: string;
}

export interface VariantDraft {
  name: string;
  price: string;
}

export async function createProduct(
  venueId: string,
  variantDrafts: VariantDraft[],
  formData: FormData,
): Promise<CreateProductActionResult> {
  const channels = String(formData.get("channels") ?? "")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);

  const response = await backendFetch("/products", {
    method: "POST",
    body: JSON.stringify({
      venueId,
      name: formData.get("name"),
      availableFrom: formData.get("availableFrom") || undefined,
      availableUntil: formData.get("availableUntil") || undefined,
      channels: channels.length ? channels : undefined,
      variants: variantDrafts
        .filter((v) => v.name.trim())
        .map((v) => ({ name: v.name, priceCents: Math.round(Number(v.price) * 100) })),
    }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    return { error: body.error ?? "Falha ao criar produto" };
  }

  revalidatePath("/admin/products");
  return {};
}

export interface SetVariantPriceActionResult {
  error?: string;
}

export async function setVariantPrice(
  productId: string,
  variantId: string,
  formData: FormData,
): Promise<SetVariantPriceActionResult> {
  const priceCents = Math.round(Number(formData.get("price")) * 100);

  const response = await backendFetch(`/products/${productId}/variants/${variantId}/price`, {
    method: "PUT",
    body: JSON.stringify({ priceCents }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    return { error: body.error ?? "Falha ao atualizar preço" };
  }

  revalidatePath("/admin/products");
  return {};
}
