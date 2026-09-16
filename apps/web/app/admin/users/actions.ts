"use server";

import { revalidatePath } from "next/cache";
import { backendFetch } from "@/lib/backend-fetch";

export interface CreateRoleAssignmentActionResult {
  error?: string;
}

/** spec: foundation/user-management - "Admin creates a role assignment". */
export async function createRoleAssignment(formData: FormData): Promise<CreateRoleAssignmentActionResult> {
  const role = formData.get("role");
  const venueId = formData.get("venueId");

  const response = await backendFetch("/users/role-assignments", {
    method: "POST",
    body: JSON.stringify({
      userId: formData.get("userId"),
      role,
      venueId: role === "admin" ? null : venueId || null,
    }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    return { error: body.error ?? "Falha ao criar atribuição" };
  }

  revalidatePath("/admin/users");
  return {};
}

export interface RevokeRoleAssignmentActionResult {
  error?: string;
}

/** spec: foundation/user-management - "Revoking a role assignment takes effect immediately". */
export async function revokeRoleAssignment(assignmentId: string): Promise<RevokeRoleAssignmentActionResult> {
  const response = await backendFetch(`/users/role-assignments/${assignmentId}`, { method: "DELETE" });

  if (!response.ok && response.status !== 204) {
    const body = await response.json().catch(() => ({}));
    return { error: body.error ?? "Falha ao revogar atribuição" };
  }

  revalidatePath("/admin/users");
  return {};
}
