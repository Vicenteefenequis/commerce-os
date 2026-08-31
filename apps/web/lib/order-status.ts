import type { BadgeVariant } from "@/components/ui/badge";

export const ORDER_STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  awaiting_payment: "Aguardando pagamento",
  paid: "Pago",
  fulfilled: "Concluído",
  partially_refunded: "Parcialmente reembolsado",
  refunded: "Reembolsado",
  cancelled: "Cancelado",
  expired: "Expirado",
};

export const ORDER_STATUS_VARIANTS: Record<string, BadgeVariant> = {
  draft: "neutral",
  awaiting_payment: "warning",
  paid: "success",
  fulfilled: "success",
  partially_refunded: "warning",
  refunded: "neutral",
  cancelled: "danger",
  expired: "danger",
};
