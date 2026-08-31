"use client";

import { useState, type FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const BUSINESS_TYPES = [
  { value: "zoologico", label: "Zoológico" },
  { value: "aquario", label: "Aquário" },
  { value: "museu", label: "Museu" },
  { value: "parque", label: "Parque" },
  { value: "fazenda-turistica", label: "Fazenda turística" },
  { value: "atracao-turistica", label: "Atração turística" },
  { value: "outro", label: "Outro" },
];

type Status = "idle" | "submitting" | "success" | "error";

export function LeadForm({ id }: { id?: string }) {
  const [businessType, setBusinessType] = useState<string>();
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string>();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setError(undefined);

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/leads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        establishmentName: formData.get("establishmentName"),
        email: formData.get("email"),
        businessType,
      }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setStatus("error");
      setError(body.error ?? "Não foi possível enviar seu contato. Tente novamente.");
      return;
    }

    setStatus("success");
    event.currentTarget.reset();
    setBusinessType(undefined);
  }

  if (status === "success") {
    return (
      <div id={id} className="rounded-lg border border-border bg-surface p-6 text-sm text-fg">
        Recebemos seu contato. Nosso time vai falar com você em breve.
      </div>
    );
  }

  return (
    <form id={id} onSubmit={onSubmit} className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-6">
      <Input label="Nome do estabelecimento" name="establishmentName" required />
      <Input label="E-mail" name="email" type="email" required />
      <Select
        label="Tipo de negócio"
        name="businessType"
        options={BUSINESS_TYPES}
        value={businessType}
        onValueChange={setBusinessType}
      />
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" isLoading={status === "submitting"}>
        Quero ser piloto
      </Button>
    </form>
  );
}
