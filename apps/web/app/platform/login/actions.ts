"use server";

import { redirect } from "next/navigation";
import { applySetCookie, backendFetch } from "@/lib/backend-fetch";

export interface PlatformLoginActionResult {
  error?: string;
}

export async function platformLogin(formData: FormData): Promise<PlatformLoginActionResult> {
  const response = await backendFetch("/platform/login", {
    method: "POST",
    body: JSON.stringify({
      email: formData.get("email"),
      password: formData.get("password"),
    }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    return { error: body.error ?? "Falha ao entrar" };
  }

  await applySetCookie(response);
  redirect("/platform/tenants");
}

export async function platformLogout(): Promise<void> {
  const response = await backendFetch("/platform/logout", { method: "POST" });
  await applySetCookie(response);
  redirect("/platform/login");
}
