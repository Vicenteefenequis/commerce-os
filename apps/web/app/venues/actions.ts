"use server";

import { revalidatePath } from "next/cache";
import { backendFetch } from "@/lib/backend-fetch";

export interface CreateVenueActionResult {
  error?: string;
}

export async function createVenue(formData: FormData): Promise<CreateVenueActionResult> {
  const response = await backendFetch("/venues", {
    method: "POST",
    body: JSON.stringify({ name: formData.get("name") }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    return { error: body.error ?? "Falha ao criar unidade" };
  }

  revalidatePath("/venues");
  return {};
}
