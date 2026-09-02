"use client";

import { useState, type FormEvent } from "react";
import { ListPageLayout } from "@/components/layout/list-page-layout";
import { FormPageLayout } from "@/components/layout/form-page-layout";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { slugify } from "@/lib/slug";
import { createTenant } from "./actions";

interface Tenant {
  id: string;
  name: string;
  slug: string;
}

export function TenantsContent({ tenants }: { tenants: Tenant[] }) {
  const { showToast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  function resetForm() {
    setSlug("");
    setSlugTouched(false);
    setFieldErrors({});
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);
    const result = await createTenant(formData);

    setIsSubmitting(false);
    if (result.error) {
      setFieldErrors({ [result.field ?? "name"]: result.error });
      return;
    }

    setDialogOpen(false);
    resetForm();
    showToast({ title: "Tenant criado", variant: "success" });
  }

  return (
    <>
      <ListPageLayout
        title="Tenants"
        description="Todos os tenants cadastrados na plataforma."
        createLabel="Novo tenant"
        onCreate={() => setDialogOpen(true)}
        isEmpty={tenants.length === 0}
        emptyStateDescription="Nenhum tenant cadastrado ainda."
      >
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>ID</TableHeaderCell>
              <TableHeaderCell>Nome</TableHeaderCell>
              <TableHeaderCell>Slug</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tenants.map((tenant) => (
              <TableRow key={tenant.id}>
                <TableCell className="font-mono text-xs">{tenant.id}</TableCell>
                <TableCell>{tenant.name}</TableCell>
                <TableCell className="font-mono text-xs">{tenant.slug}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ListPageLayout>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}
        title="Novo tenant"
      >
        <FormPageLayout
          title=""
          onSubmit={onSubmit}
          onCancel={() => setDialogOpen(false)}
          isSubmitting={isSubmitting}
          fieldErrors={fieldErrors}
        >
          <Input
            label="Nome"
            name="name"
            required
            onChange={(e) => {
              if (!slugTouched) setSlug(slugify(e.target.value));
            }}
          />
          <Input
            label="Slug (usado no link público da loja)"
            name="slug"
            required
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
          />
        </FormPageLayout>
      </Dialog>
    </>
  );
}
