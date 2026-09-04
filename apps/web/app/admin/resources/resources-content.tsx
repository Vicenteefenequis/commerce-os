"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ListPageLayout } from "@/components/layout/list-page-layout";
import { FormPageLayout } from "@/components/layout/form-page-layout";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { checkResourceAvailability, createResource, updateResourceCapacity } from "./actions";

interface Venue {
  id: string;
  name: string;
}

interface Resource {
  id: string;
  venueId: string;
  name: string;
  defaultCapacity: number;
  hardCapacity: boolean;
}

export function ResourcesContent({
  venues,
  venueId,
  resources,
}: {
  venues: Venue[];
  venueId?: string;
  resources: Resource[];
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [capacityDialog, setCapacityDialog] = useState<Resource | null>(null);
  const [availabilityDialog, setAvailabilityDialog] = useState<Resource | null>(null);
  const [availabilityResult, setAvailabilityResult] = useState<{ period: string; available: number } | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function onSelectVenue(nextVenueId: string) {
    router.push(`/admin/resources?venueId=${nextVenueId}`);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!venueId) {
      showToast({
        title: "Selecione uma unidade",
        description: "Crie ou selecione uma unidade antes de cadastrar um recurso.",
        variant: "error",
      });
      return;
    }
    setIsSubmitting(true);
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);
    const result = await createResource(venueId, formData);

    setIsSubmitting(false);
    if (result.error) {
      setFieldErrors({ name: result.error });
      return;
    }

    setDialogOpen(false);
    showToast({ title: "Recurso criado", variant: "success" });
  }

  async function onSetCapacity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!capacityDialog) return;
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const result = await updateResourceCapacity(capacityDialog.id, formData);

    setIsSubmitting(false);
    if (result.error) {
      showToast({ title: "Falha ao definir capacidade", description: result.error, variant: "error" });
      return;
    }

    setCapacityDialog(null);
    showToast({ title: "Capacidade definida", variant: "success" });
  }

  async function onCheckAvailability(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!availabilityDialog) return;
    setIsSubmitting(true);
    setAvailabilityResult(null);

    const formData = new FormData(event.currentTarget);
    const period = String(formData.get("period"));
    const result = await checkResourceAvailability(availabilityDialog.id, formData);

    setIsSubmitting(false);
    if (result.error) {
      showToast({ title: "Falha ao consultar capacidade", description: result.error, variant: "error" });
      return;
    }
    setAvailabilityResult({ period, available: result.available! });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="max-w-xs">
        <Select
          label="Unidade"
          value={venueId}
          onValueChange={onSelectVenue}
          options={venues.map((v) => ({ value: v.id, label: v.name }))}
          placeholder="Selecione uma unidade"
        />
      </div>

      <ListPageLayout
        title="Recursos"
        description="Recursos com capacidade cadastrados na unidade selecionada."
        createLabel="Novo recurso"
        onCreate={() => setDialogOpen(true)}
        isEmpty={!venueId || resources.length === 0}
        emptyStateDescription={
          venues.length === 0
            ? "Nenhuma unidade cadastrada ainda. Crie uma unidade antes de cadastrar recursos."
            : "Nenhum recurso cadastrado para esta unidade."
        }
      >
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Nome</TableHeaderCell>
              <TableHeaderCell>Capacidade padrão</TableHeaderCell>
              <TableHeaderCell>Tipo</TableHeaderCell>
              <TableHeaderCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {resources.map((resource) => (
              <TableRow key={resource.id}>
                <TableCell label="Nome">{resource.name}</TableCell>
                <TableCell label="Capacidade padrão">{resource.defaultCapacity}</TableCell>
                <TableCell label="Tipo">
                  <Badge variant={resource.hardCapacity ? "warning" : "neutral"}>
                    {resource.hardCapacity ? "Rígida" : "Flexível"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" type="button" onClick={() => setCapacityDialog(resource)}>
                      Definir capacidade
                    </Button>
                    <Button
                      variant="ghost"
                      type="button"
                      onClick={() => {
                        setAvailabilityResult(null);
                        setAvailabilityDialog(resource);
                      }}
                    >
                      Ver disponível
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ListPageLayout>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen} title="Novo recurso">
        <FormPageLayout
          title=""
          onSubmit={onSubmit}
          onCancel={() => setDialogOpen(false)}
          isSubmitting={isSubmitting}
          fieldErrors={fieldErrors}
        >
          <Input label="Nome" name="name" required />
          <Input label="Capacidade padrão" name="defaultCapacity" type="number" required />
          <Select
            label="Capacidade rígida?"
            name="hardCapacity"
            options={[
              { value: "no", label: "Não (flexível)" },
              { value: "yes", label: "Sim (rígida)" },
            ]}
            placeholder="Selecione"
          />
        </FormPageLayout>
      </Dialog>

      <Dialog
        open={capacityDialog !== null}
        onOpenChange={(open) => !open && setCapacityDialog(null)}
        title={capacityDialog ? `Capacidade de ${capacityDialog.name}` : ""}
      >
        {capacityDialog && (
          <FormPageLayout
            title=""
            onSubmit={onSetCapacity}
            onCancel={() => setCapacityDialog(null)}
            isSubmitting={isSubmitting}
          >
            <Input label="Período (ex: 2026-08-30)" name="period" required />
            <Input label="Capacidade" name="capacity" type="number" required />
          </FormPageLayout>
        )}
      </Dialog>

      <Dialog
        open={availabilityDialog !== null}
        onOpenChange={(open) => !open && setAvailabilityDialog(null)}
        title={availabilityDialog ? `Disponibilidade de ${availabilityDialog.name}` : ""}
      >
        {availabilityDialog && (
          <FormPageLayout
            title=""
            onSubmit={onCheckAvailability}
            onCancel={() => setAvailabilityDialog(null)}
            submitLabel="Consultar"
            isSubmitting={isSubmitting}
          >
            <Input label="Período (ex: 2026-08-30)" name="period" required />
            {availabilityResult && (
              <p className="text-sm text-fg">
                Disponível em {availabilityResult.period}:{" "}
                <span className="font-semibold">{availabilityResult.available}</span>
              </p>
            )}
          </FormPageLayout>
        )}
      </Dialog>
    </div>
  );
}
