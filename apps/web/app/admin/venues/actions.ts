"use server";

import { revalidatePath } from "next/cache";
import { backendFetch } from "@/lib/backend-fetch";

export interface CreateVenueActionResult {
  error?: string;
  field?: "name" | "slug";
}

export async function createVenue(formData: FormData): Promise<CreateVenueActionResult> {
  const response = await backendFetch("/venues", {
    method: "POST",
    body: JSON.stringify({ name: formData.get("name"), slug: formData.get("slug") }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const error: string = body.error ?? "Falha ao criar unidade";
    return { error, field: error.toLowerCase().includes("slug") ? "slug" : "name" };
  }

  revalidatePath("/admin/venues");
  return {};
}
