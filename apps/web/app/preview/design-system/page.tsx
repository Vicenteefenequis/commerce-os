"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dialog } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { ListPageLayout } from "@/components/layout/list-page-layout";
import { FormPageLayout } from "@/components/layout/form-page-layout";

const SAMPLE_VENUES = [
  { id: "1", name: "Unidade Norte", status: "active" as const },
  { id: "2", name: "Unidade Sul", status: "inactive" as const },
];

/**
 * Internal, unlinked preview exercising every base component and both
 * layout patterns together (tasks.md 4.1). Not part of the admin's real
 * navigation - remove or gate behind a dev-only flag once real CRUD
 * screens exist to exercise the same components.
 */
export default function DesignSystemPreviewPage() {
  return (
    <ToastProvider>
      <PreviewContent />
    </ToastProvider>
  );
}

function PreviewContent() {
  const { showToast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [listIsEmpty, setListIsEmpty] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [country, setCountry] = useState<string>();

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-12 p-8">
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-fg">Buttons</h2>
        <div className="flex flex-wrap gap-3">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="ghost">Ghost</Button>
          <Button isLoading>Loading</Button>
          <Button disabled>Disabled</Button>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-fg">Badges</h2>
        <div className="flex flex-wrap gap-2">
          <Badge>Neutral</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="danger">Danger</Badge>
          <Badge variant="warning">Warning</Badge>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-fg">Card</h2>
        <Card>
          <CardHeader title="Resumo" description="Exemplo de card com tokens do design system." />
          <p className="text-sm text-fg-muted">Conteúdo de exemplo.</p>
        </Card>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-fg">Inputs and Select</h2>
        <div className="flex max-w-sm flex-col gap-4">
          <Input label="Nome" placeholder="Digite o nome" />
          <Input label="E-mail" placeholder="voce@exemplo.com" error="E-mail inválido" />
          <Select
            label="País"
            value={country}
            onValueChange={setCountry}
            options={[
              { value: "br", label: "Brasil" },
              { value: "pt", label: "Portugal" },
            ]}
          />
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-fg">Dialog</h2>
        <Button variant="secondary" onClick={() => setDialogOpen(true)}>
          Abrir dialog
        </Button>
        <Dialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          title="Confirmar ação"
          description="Este é um dialog de exemplo com foco preso e fechamento por Escape."
        >
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={() => setDialogOpen(false)}>
              Confirmar
            </Button>
          </div>
        </Dialog>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-fg">Toast</h2>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={() => showToast({ title: "Salvo com sucesso", variant: "success" })}
          >
            Disparar toast de sucesso
          </Button>
          <Button
            variant="secondary"
            onClick={() => showToast({ title: "Falha ao salvar", description: "Tente novamente.", variant: "error" })}
          >
            Disparar toast de erro
          </Button>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-fg">ListPageLayout</h2>
        <Button variant="secondary" onClick={() => setListIsEmpty((current) => !current)}>
          Alternar estado vazio ({listIsEmpty ? "vazio" : "com dados"})
        </Button>
        <ListPageLayout
          title="Venues"
          description="Estabelecimentos da organização."
          createLabel="Novo venue"
          onCreate={() => showToast({ title: "Criar venue", variant: "success" })}
          isEmpty={listIsEmpty}
          emptyStateDescription="Nenhum venue cadastrado ainda."
        >
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Nome</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {SAMPLE_VENUES.map((venue) => (
                <TableRow key={venue.id}>
                  <TableCell>{venue.name}</TableCell>
                  <TableCell>
                    <Badge variant={venue.status === "active" ? "success" : "neutral"}>
                      {venue.status === "active" ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ListPageLayout>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-fg">FormPageLayout</h2>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={() =>
              setFieldErrors((current): Record<string, string> =>
                Object.keys(current).length ? {} : { name: "Nome é obrigatório" },
              )
            }
          >
            Alternar erro de campo
          </Button>
          <Button variant="secondary" onClick={() => setIsSubmitting((current) => !current)}>
            Alternar isSubmitting ({isSubmitting ? "on" : "off"})
          </Button>
        </div>
        <FormPageLayout
          title="Novo venue"
          description="Exemplo de formulário usando o padrão de layout."
          onSubmit={(event) => {
            event.preventDefault();
            showToast({ title: "Formulário enviado", variant: "success" });
          }}
          onCancel={() => showToast({ title: "Formulário cancelado", variant: "error" })}
          isSubmitting={isSubmitting}
          fieldErrors={fieldErrors}
        >
          <Input label="Nome" name="name" placeholder="Nome do venue" />
          <Input label="Endereço" name="address" placeholder="Endereço" />
        </FormPageLayout>
      </section>
    </main>
  );
}
