"use server";

import { revalidatePath } from "next/cache";
import { backendFetch } from "@/lib/backend-fetch";

export interface CreateTenantActionResult {
  error?: string;
  field?: "name" | "slug" | "email" | "password";
}

export async function createTenant(formData: FormData): Promise<CreateTenantActionResult> {
  const response = await backendFetch("/platform/organizations", {
    method: "POST",
    body: JSON.stringify({
      name: formData.get("name"),
      slug: formData.get("slug"),
      email: formData.get("email"),
      password: formData.get("password"),
    }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const error: string = body.error ?? "Falha ao criar tenant";
    const lowerError = error.toLowerCase();
    const field = lowerError.includes("slug")
      ? "slug"
      : lowerError.includes("password")
        ? "password"
        : lowerError.includes("email")
          ? "email"
          : "name";
    return { error, field };
  }

  revalidatePath("/platform/tenants");
  return {};
}

export async function setOrganizationVerified(
  organizationId: string,
  verified: boolean,
): Promise<{ error?: string }> {
  const response = await backendFetch(`/platform/organizations/${organizationId}/verified`, {
    method: "PATCH",
    body: JSON.stringify({ verified }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    return { error: body.error ?? "Falha ao atualizar verificação" };
  }

  revalidatePath("/platform/tenants");
  return {};
}
