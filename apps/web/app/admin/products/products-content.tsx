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
import { createProduct, setVariantPrice, type VariantDraft } from "./actions";

interface Venue {
  id: string;
  name: string;
}

interface Variant {
  id: string;
  name: string;
  priceCents: number;
}

interface Product {
  id: string;
  venueId: string;
  name: string;
  availableFrom: string | null;
  availableUntil: string | null;
  channels: string[];
  variants: Variant[];
}

export function ProductsContent({
  venues,
  venueId,
  products,
}: {
  venues: Venue[];
  venueId?: string;
  products: Product[];
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [priceDialog, setPriceDialog] = useState<{ productId: string; variant: Variant } | null>(null);
  const [variantDrafts, setVariantDrafts] = useState<VariantDraft[]>([{ name: "", price: "" }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function onSelectVenue(nextVenueId: string) {
    router.push(`/admin/products?venueId=${nextVenueId}`);
  }

  function updateVariantDraft(index: number, field: keyof VariantDraft, value: string) {
    setVariantDrafts((current) =>
      current.map((draft, i) => (i === index ? { ...draft, [field]: value } : draft)),
    );
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!venueId) {
      showToast({
        title: "Selecione uma unidade",
        description: "Crie ou selecione uma unidade antes de cadastrar um produto.",
        variant: "error",
      });
      return;
    }
    setIsSubmitting(true);
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);
    const result = await createProduct(venueId, variantDrafts, formData);

    setIsSubmitting(false);
    if (result.error) {
      setFieldErrors({ name: result.error });
      return;
    }

    setDialogOpen(false);
    setVariantDrafts([{ name: "", price: "" }]);
    showToast({ title: "Produto criado", variant: "success" });
  }

  async function onSetPrice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!priceDialog) return;
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const result = await setVariantPrice(priceDialog.productId, priceDialog.variant.id, formData);

    setIsSubmitting(false);
    if (result.error) {
      showToast({ title: "Falha ao atualizar preço", description: result.error, variant: "error" });
      return;
    }

    setPriceDialog(null);
    showToast({ title: "Preço atualizado", variant: "success" });
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
        title="Produtos"
        description="Produtos cadastrados na unidade selecionada."
        createLabel="Novo produto"
        onCreate={() => setDialogOpen(true)}
        isEmpty={!venueId || products.length === 0}
        emptyStateDescription={
          venues.length === 0
            ? "Nenhuma unidade cadastrada ainda. Crie uma unidade antes de cadastrar produtos."
            : "Nenhum produto cadastrado para esta unidade."
        }
      >
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Nome</TableHeaderCell>
              <TableHeaderCell>Variantes</TableHeaderCell>
              <TableHeaderCell>Canais</TableHeaderCell>
              <TableHeaderCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id}>
                <TableCell>{product.name}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-2">
                    {product.variants.map((variant) => (
                      <Badge key={variant.id} variant="neutral">
                        {variant.name}: R$ {(variant.priceCents / 100).toFixed(2)}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  {product.channels.length ? product.channels.join(", ") : "todos"}
                </TableCell>
                <TableCell>
                  {product.variants[0] && (
                    <Button
                      variant="secondary"
                      type="button"
                      onClick={() => setPriceDialog({ productId: product.id, variant: product.variants[0] })}
                    >
                      Definir preço
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ListPageLayout>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen} title="Novo produto">
        <FormPageLayout
          title=""
          onSubmit={onSubmit}
          onCancel={() => setDialogOpen(false)}
          isSubmitting={isSubmitting}
          fieldErrors={fieldErrors}
        >
          <Input label="Nome" name="name" required />
          <Input label="Disponível de" name="availableFrom" type="date" />
          <Input label="Disponível até" name="availableUntil" type="date" />
          <Input label="Canais (separados por vírgula)" name="channels" placeholder="online, loja" />

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-fg">Variantes</span>
            {variantDrafts.map((draft, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  label="Nome da variante"
                  value={draft.name}
                  onChange={(e) => updateVariantDraft(index, "name", e.target.value)}
                />
                <Input
                  label="Preço (R$)"
                  type="number"
                  step="0.01"
                  value={draft.price}
                  onChange={(e) => updateVariantDraft(index, "price", e.target.value)}
                />
              </div>
            ))}
            <Button
              type="button"
              variant="ghost"
              onClick={() => setVariantDrafts((current) => [...current, { name: "", price: "" }])}
            >
              + Adicionar variante
            </Button>
          </div>
        </FormPageLayout>
      </Dialog>

      <Dialog
        open={priceDialog !== null}
        onOpenChange={(open) => !open && setPriceDialog(null)}
        title={priceDialog ? `Preço de ${priceDialog.variant.name}` : ""}
      >
        {priceDialog && (
          <FormPageLayout
            title=""
            onSubmit={onSetPrice}
            onCancel={() => setPriceDialog(null)}
            isSubmitting={isSubmitting}
          >
            <Input
              label="Novo preço (R$)"
              name="price"
              type="number"
              step="0.01"
              defaultValue={(priceDialog.variant.priceCents / 100).toFixed(2)}
              required
            />
          </FormPageLayout>
        )}
      </Dialog>
    </div>
  );
}
