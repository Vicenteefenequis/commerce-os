"use server";

import { redirect } from "next/navigation";
import { applySetCookie, backendFetch } from "@/lib/backend-fetch";

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
  redirect("/venues");
}

export async function logout(): Promise<void> {
  const response = await backendFetch("/auth/logout", { method: "POST" });
  await applySetCookie(response);
  redirect("/login");
}
