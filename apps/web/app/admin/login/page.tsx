"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { FormPageLayout } from "@/components/layout/form-page-layout";
import { login } from "./actions";

export default function LoginPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(undefined);

    const formData = new FormData(event.currentTarget);
    const result = await login(formData);

    setIsSubmitting(false);
    if (result?.error) {
      setError(result.error);
    }
  }

  return (
    <main className="mx-auto max-w-sm p-8">
      <FormPageLayout
        title="Entrar"
        description="Use um usuário e tenant já existentes no banco para testar as telas."
        onSubmit={onSubmit}
        onCancel={() => router.push("/admin")}
        submitLabel="Entrar"
        isSubmitting={isSubmitting}
      >
        <Input label="Tenant ID" name="tenantId" required />
        <Input label="E-mail" name="email" type="email" required />
        <Input label="Senha" name="password" type="password" required />
        {error && <p className="text-sm text-danger">{error}</p>}
      </FormPageLayout>
    </main>
  );
}
