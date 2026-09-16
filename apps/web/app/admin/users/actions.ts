"use server";

import { revalidatePath } from "next/cache";
import { backendFetch } from "@/lib/backend-fetch";

export interface CreateUserActionResult {
  error?: string;
  field?: "email" | "password" | "role" | "venueId";
}

/** spec: foundation/user-management - "Admin creates a new user together with their first role assignment". */
export async function createUser(formData: FormData): Promise<CreateUserActionResult> {
  const role = formData.get("role");
  const venueId = formData.get("venueId");

  const response = await backendFetch("/users", {
    method: "POST",
    body: JSON.stringify({
      email: formData.get("email"),
      password: formData.get("password"),
      role,
      venueId: role === "admin" ? null : venueId || null,
    }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const error: string = body.error ?? "Falha ao criar usuário";
    return { error, field: response.status === 409 ? "email" : undefined };
  }

  revalidatePath("/admin/users");
  return {};
}

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
