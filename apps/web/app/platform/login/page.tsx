"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { FormPageLayout } from "@/components/layout/form-page-layout";
import { platformLogin } from "./actions";

export default function PlatformLoginPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(undefined);

    const formData = new FormData(event.currentTarget);
    const result = await platformLogin(formData);

    setIsSubmitting(false);
    if (result?.error) {
      setError(result.error);
    }
  }

  return (
    <main className="mx-auto max-w-sm p-8">
      <FormPageLayout
        title="Entrar como plataforma"
        description="Acesso do dono da plataforma, para gerenciar todos os tenants."
        onSubmit={onSubmit}
        onCancel={() => router.push("/")}
        submitLabel="Entrar"
        isSubmitting={isSubmitting}
      >
        <Input label="E-mail" name="email" type="email" required />
        <Input label="Senha" name="password" type="password" required />
        {error && <p className="text-sm text-danger">{error}</p>}
      </FormPageLayout>
    </main>
  );
}
