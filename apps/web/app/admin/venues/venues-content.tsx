"use client";

import { useState, type FormEvent } from "react";
import { ListPageLayout } from "@/components/layout/list-page-layout";
import { FormPageLayout } from "@/components/layout/form-page-layout";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { createVenue } from "./actions";

interface Venue {
  id: string;
  name: string;
}

export function VenuesContent({ venues }: { venues: Venue[] }) {
  const { showToast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);
    const result = await createVenue(formData);

    setIsSubmitting(false);
    if (result.error) {
      setFieldErrors({ name: result.error });
      return;
    }

    setDialogOpen(false);
    showToast({ title: "Unidade criada", variant: "success" });
  }

  return (
    <>
      <ListPageLayout
        title="Unidades"
        description="Venues cadastradas para este tenant."
        createLabel="Nova unidade"
        onCreate={() => setDialogOpen(true)}
        isEmpty={venues.length === 0}
        emptyStateDescription="Nenhuma unidade cadastrada ainda."
      >
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>ID</TableHeaderCell>
              <TableHeaderCell>Nome</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {venues.map((venue) => (
              <TableRow key={venue.id}>
                <TableCell className="font-mono text-xs">{venue.id}</TableCell>
                <TableCell>{venue.name}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ListPageLayout>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen} title="Nova unidade">
        <FormPageLayout
          title=""
          onSubmit={onSubmit}
          onCancel={() => setDialogOpen(false)}
          isSubmitting={isSubmitting}
          fieldErrors={fieldErrors}
        >
          <Input label="Nome" name="name" required />
        </FormPageLayout>
      </Dialog>
    </>
  );
}
