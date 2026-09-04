"use client";

import { useState, type FormEvent } from "react";
import { ListPageLayout } from "@/components/layout/list-page-layout";
import { FormPageLayout } from "@/components/layout/form-page-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { slugify } from "@/lib/slug";
import { createVenue, updateVenue } from "./actions";

interface Venue {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  address: string | null;
  city: string | null;
  category: string | null;
  coverPhotoUrl: string | null;
  published: boolean;
}

export function VenuesContent({ venues }: { venues: Venue[] }) {
  const { showToast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  const [editingVenue, setEditingVenue] = useState<Venue | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  function resetCreateForm() {
    setSlug("");
    setSlugTouched(false);
    setFieldErrors({});
  }

  async function onCreateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);
    const result = await createVenue(formData);

    setIsSubmitting(false);
    if (result.error) {
      setFieldErrors({ [result.field ?? "name"]: result.error });
      return;
    }

    setCreateDialogOpen(false);
    resetCreateForm();
    showToast({ title: "Unidade criada", variant: "success" });
  }

  async function onEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingVenue) return;
    setIsSaving(true);
    setEditErrors({});

    const formData = new FormData(event.currentTarget);
    const result = await updateVenue(editingVenue.id, formData);

    setIsSaving(false);
    if (result.error) {
      setEditErrors({ [result.field ?? "description"]: result.error });
      return;
    }

    setEditingVenue(null);
    showToast({ title: "Unidade atualizada", variant: "success" });
  }

  return (
    <>
      <ListPageLayout
        title="Unidades"
        description="Venues cadastradas para este tenant."
        createLabel="Nova unidade"
        onCreate={() => setCreateDialogOpen(true)}
        isEmpty={venues.length === 0}
        emptyStateDescription="Nenhuma unidade cadastrada ainda."
      >
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Nome</TableHeaderCell>
              <TableHeaderCell>Slug</TableHeaderCell>
              <TableHeaderCell>Cidade</TableHeaderCell>
              <TableHeaderCell>Publicada</TableHeaderCell>
              <TableHeaderCell>Ações</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {venues.map((venue) => (
              <TableRow key={venue.id}>
                <TableCell label="Nome">{venue.name}</TableCell>
                <TableCell label="Slug" className="font-mono text-xs">
                  {venue.slug}
                </TableCell>
                <TableCell label="Cidade">{venue.city ?? "—"}</TableCell>
                <TableCell label="Publicada">
                  <Badge variant={venue.published ? "success" : "neutral"}>
                    {venue.published ? "Publicada" : "Não publicada"}
                  </Badge>
                </TableCell>
                <TableCell label="Ações">
                  <Button variant="ghost" onClick={() => setEditingVenue(venue)}>
                    Editar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ListPageLayout>

      <Dialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          setCreateDialogOpen(open);
          if (!open) resetCreateForm();
        }}
        title="Nova unidade"
      >
        <FormPageLayout
          title=""
          onSubmit={onCreateSubmit}
          onCancel={() => setCreateDialogOpen(false)}
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

      <Dialog
        open={editingVenue !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditingVenue(null);
            setEditErrors({});
          }
        }}
        title={editingVenue ? `Editar ${editingVenue.name}` : "Editar unidade"}
      >
        {editingVenue && (
          <FormPageLayout
            title=""
            onSubmit={onEditSubmit}
            onCancel={() => setEditingVenue(null)}
            isSubmitting={isSaving}
            fieldErrors={editErrors}
          >
            <Input label="Descrição" name="description" defaultValue={editingVenue.description ?? ""} />
            <Input label="Endereço" name="address" defaultValue={editingVenue.address ?? ""} />
            <Input label="Cidade" name="city" defaultValue={editingVenue.city ?? ""} />
            <Input
              label="Categoria"
              name="category"
              defaultValue={editingVenue.category ?? ""}
              list="venue-categories"
            />
            <datalist id="venue-categories">
              {[...new Set(venues.map((v) => v.category).filter((c): c is string => Boolean(c)))].map(
                (category) => (
                  <option key={category} value={category} />
                ),
              )}
            </datalist>
            <Input
              label="Foto de apresentação (URL)"
              name="coverPhotoUrl"
              type="url"
              defaultValue={editingVenue.coverPhotoUrl ?? ""}
              placeholder="https://..."
            />
            <label className="flex items-center gap-2 text-sm font-medium text-fg">
              <input
                type="checkbox"
                name="published"
                defaultChecked={editingVenue.published}
                className="h-4 w-4 rounded border-border-strong"
              />
              Publicar na busca
            </label>
          </FormPageLayout>
        )}
      </Dialog>
    </>
  );
}
