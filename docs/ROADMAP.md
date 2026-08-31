# Roadmap até o MVP

**Referência:** `docs/prd.md` (§30 MVP, §32 Roadmap, §40 Ordem recomendada de especificação, §43 Definition of Done)

Este arquivo é a referência viva do que falta para o MVP. Atualize os status conforme cada milestone é fechado (proposta → implementação → sync/archive no OpenSpec).

---

## Fase 0 — Foundation ✅ concluída

- Organization
- Venue
- Identity (login/logout/sessão)
- Authorization (RBAC)
- Audit
- Configuration

## Já implementado

- `auth-session-awareness` — `GET /auth/me`, middleware de rota protegida, nav com sessão, logout na UI (archived: `2026-08-31-auth-session-awareness`)
- Catalog/Product — criação, variantes, preço, janela de disponibilidade, visibilidade por canal, auditoria, vínculo opcional de capacidade (`resourceId`)
- Capacity/Resource — capacidade máxima, override por período, cálculo de disponibilidade, prevenção de overbooking, auditoria

---

## Milestones até o MVP

### M1 — Reservation ✅ concluído
Fecha o lifecycle de capacidade que falta em `capacity/resource`.

- Lifecycle `pending → confirmed → expired/cancelled/consumed` (PRD §17)
- Hold temporário durante checkout (CAP-006)
- Expiração de holds via `POST /reservations/:id/expire` (CAP-007) — acionada pelo caller, não há job/cron automático ainda
- **Pré-requisito de todos os milestones seguintes.**

Change: `archive/2026-08-31-capacity-reservation-lifecycle`

### M2 — Order + Checkout ✅ concluído

- `order`: lifecycle `draft → awaiting_payment → paid → fulfilled → partially_refunded → refunded → cancelled → expired` (ORD-001/002/003), snapshot das condições comerciais no pedido
- Checkout público sem conta obrigatória (CHK-001), mobile-first via API (CHK-002 — sem UI de storefront ainda)
- Servidor recalcula preço, nunca confia em valores do cliente (CHK-004)
- Prevenção de duplicidade acidental de pedido via idempotency key (CHK-005)
- Vínculo Variant → Resource (`resourceId` opcional e fixo) para saber o que cada item de pedido reserva
- Sem UI de storefront/checkout público — apenas API (`POST /checkout`, `GET/cancel /orders/:id`); fica para um change futuro

Change: `archive/2026-08-31-add-order-checkout`

### M3 — Payment ✅ concluído

- Abstração de Payment Provider (PAY-001)
- Pix + cartão (PAY-002) — cartão validado ponta a ponta em modo teste da Stripe; **Pix implementado no código mas bloqueado**, não está ativado na conta Stripe usada (`payment_intent_invalid_parameter`) — precisa ser habilitado no dashboard, sem necessidade de mudança de código
- Webhooks idempotentes (PAY-003)
- Nunca confirmar pagamento só pelo redirect do navegador (PAY-004)
- Suporte a reembolso (PAY-005)
- Trilha de auditoria em mudanças financeiras (PAY-006)
- Página pública de pagamento (`apps/web/app/pay/[orderId]`) via Stripe Payment Element

**Marco PRD: "primeiro R$1 processado."** — atingível para cartão; Pix depende de configuração externa na conta Stripe.

Changes: `archive/2026-08-31-add-payment`, `archive/2026-08-31-add-order-fulfillment` (consumo de reserva no `paid`/`fulfilled`, não estava neste roadmap), `archive/2026-08-31-add-order-payment-admin` (listagem de pedidos + visão de pagamento no admin)

> Atenção operacional: não há `.env` versionado no repo (só `.env.example`). `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET` precisam estar configurados no ambiente para `POST /orders/:id/payment-intent` e o webhook funcionarem.

### M4 — Entitlement + Ticket ✅ concluído (parcial — envio de e-mail bloqueado por configuração externa)

- Checkout agora captura comprador (`customer: { email, name }`), resolvido/criado como `Customer` tenant-scoped e vinculado ao `Order` (`Order.customerId`, snapshot na criação)
- Emissão de entitlement ao `order.paid` (TKT-001) — 1 Entitlement por unidade comprada, disparado por outbox consumer em `order.status_changed`, idempotente
- Ticket com identificador único (código, base para QR) que referencia o direito, não é a regra de autorização (TKT-002/003/004) — vínculo 1:1 Entitlement:Ticket
- Envio de confirmação/ticket por e-mail (COM-001/002) — implementado via `EmailProviderPort` (mesmo padrão de abstração de `PaymentProviderPort`), mas **sem provedor real configurado ainda**: usa `NullEmailProvider`, que registra a tentativa como `not_configured` sem falhar. Mesma postura operacional do Pix em M3 — código pronto, falta escolher/configurar um provedor (Resend recomendado) e plugar o adapter concreto.

Change: `archive/2026-08-31-add-entitlement-ticket`

### M5 — Access Control

- Scanner web/PWA (ACS-001)
- Resposta clara: autorizado / já utilizado / inválido / expirado / local incorreto / horário incorreto (ACS-002)
- Consumo atômico do entitlement, proteção contra double scanning (ACS-004/005)

**Marco PRD: "primeiro visitante entrando utilizando exclusivamente a plataforma."**

Status: não iniciado

### M6 — Dashboard mínimo

- Vendas, pedidos, visitantes (PRD §30)
- Fecha o Definition of Done do MVP (PRD §43)

Status: não iniciado

---

## Definition of Done do MVP (PRD §43)

Um estabelecimento piloto deve conseguir, sem intervenção técnica:

1. cadastrar sua empresa
2. cadastrar estabelecimento
3. cadastrar produto
4. configurar preço
5. configurar capacidade
6. publicar oferta
7. receber comprador
8. aceitar pagamento real
9. emitir ticket
10. enviar ticket
11. escanear QR Code
12. liberar entrada
13. visualizar venda
14. localizar pedido
15. acompanhar número de visitantes

> Teste final: **"Uma pessoa real pagou, recebeu seu ingresso e entrou no estabelecimento sem alguém da equipe de desenvolvimento tocar no banco de dados."**

---

## Explicitamente fora do MVP (PRD §31)

marketplace, veterinária, IA, loyalty points, gift cards, dynamic pricing, fiscal completo, memberships, CRM avançado, integrações com catracas, aplicativo mobile, white label profundo, múltiplas moedas, múltiplos países.

---

## Como usar este arquivo

Cada milestone (M1–M6) vira uma OpenSpec change própria, seguindo a ordem recomendada do PRD (§40). Ao concluir um milestone:

1. Marque o status acima como `✅ concluído`.
2. Adicione a referência ao change/commit correspondente.
3. Não avance para o próximo milestone sem necessidade real — evite construir antecipadamente (PRD §37, risco R1).
