"use server";

import { revalidatePath } from "next/cache";
import { backendFetch } from "@/lib/backend-fetch";

export interface CreateTenantActionResult {
  error?: string;
  field?: "name" | "slug";
}

export async function createTenant(formData: FormData): Promise<CreateTenantActionResult> {
  const response = await backendFetch("/platform/organizations", {
    method: "POST",
    body: JSON.stringify({ name: formData.get("name"), slug: formData.get("slug") }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const error: string = body.error ?? "Falha ao criar tenant";
    return { error, field: error.toLowerCase().includes("slug") ? "slug" : "name" };
  }

  revalidatePath("/platform/tenants");
  return {};
}
