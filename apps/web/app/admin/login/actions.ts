"use server";

import { redirect } from "next/navigation";
import { applySetCookie, backendFetch } from "@/lib/backend-fetch";
import { firstAllowedPath } from "@/lib/roles";

export interface LoginActionResult {
  error?: string;
}

export async function login(formData: FormData): Promise<LoginActionResult> {
  const response = await backendFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({
      tenantId: formData.get("tenantId"),
      email: formData.get("email"),
      password: formData.get("password"),
    }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    return { error: body.error ?? "Falha ao entrar" };
  }

  await applySetCookie(response);

  /**
   * spec: admin/dashboard - "Login redirects a restricted role away from
   * the dashboard": Admin lands on Dashboard, every other role lands on
   * the first screen their role permits (openspec change
   * add-venue-scoped-user-roles).
   */
  const me = await backendFetch("/auth/me");
  const identity: { roles?: string[] } | null = me.ok ? await me.json() : null;
  redirect(firstAllowedPath(identity?.roles ?? []));
}

export async function logout(): Promise<void> {
  const response = await backendFetch("/auth/logout", { method: "POST" });
  await applySetCookie(response);
  redirect("/admin/login");
}
