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

export interface UpdateVenueActionResult {
  error?: string;
  field?: "coverPhotoUrl";
}

/** spec: foundation/venue - "Venue profile fields are owner-editable", "Venue publish toggle is owner-controlled". */
export async function updateVenue(venueId: string, formData: FormData): Promise<UpdateVenueActionResult> {
  const response = await backendFetch(`/venues/${venueId}`, {
    method: "PATCH",
    body: JSON.stringify({
      description: emptyToNull(formData.get("description")),
      address: emptyToNull(formData.get("address")),
      city: emptyToNull(formData.get("city")),
      category: emptyToNull(formData.get("category")),
      coverPhotoUrl: emptyToNull(formData.get("coverPhotoUrl")),
      published: formData.get("published") === "on",
    }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const error: string = body.error ?? "Falha ao salvar unidade";
    return { error, field: error.toLowerCase().includes("url") ? "coverPhotoUrl" : undefined };
  }

  revalidatePath("/admin/venues");
  return {};
}

function emptyToNull(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string" || value.trim().length === 0) return null;
  return value;
}
