"use server";

import { revalidatePath } from "next/cache";
import { backendFetch } from "@/lib/backend-fetch";

export interface CreateResourceActionResult {
  error?: string;
}

export async function createResource(
  venueId: string,
  formData: FormData,
): Promise<CreateResourceActionResult> {
  const response = await backendFetch("/resources", {
    method: "POST",
    body: JSON.stringify({
      venueId,
      name: formData.get("name"),
      defaultCapacity: Number(formData.get("defaultCapacity")),
      hardCapacity: formData.get("hardCapacity") === "yes",
    }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    return { error: body.error ?? "Falha ao criar recurso" };
  }

  revalidatePath("/resources");
  return {};
}

export interface CheckResourceAvailabilityActionResult {
  available?: number;
  error?: string;
}

export async function checkResourceAvailability(
  resourceId: string,
  formData: FormData,
): Promise<CheckResourceAvailabilityActionResult> {
  const period = String(formData.get("period"));
  const response = await backendFetch(
    `/resources/${resourceId}/available-capacity?period=${encodeURIComponent(period)}`,
  );

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    return { error: body.error ?? "Falha ao consultar capacidade" };
  }

  const body = await response.json();
  return { available: body.available };
}

export interface UpdateResourceCapacityActionResult {
  error?: string;
}

export async function updateResourceCapacity(
  resourceId: string,
  formData: FormData,
): Promise<UpdateResourceCapacityActionResult> {
  const response = await backendFetch(`/resources/${resourceId}/capacity`, {
    method: "PUT",
    body: JSON.stringify({
      period: formData.get("period"),
      capacity: Number(formData.get("capacity")),
    }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    return { error: body.error ?? "Falha ao definir capacidade" };
  }

  revalidatePath("/resources");
  return {};
}
