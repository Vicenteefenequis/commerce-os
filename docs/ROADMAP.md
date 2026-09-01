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

### M5 — Access Control ✅ concluído (parcial — sem UI de scanner ainda)

- `POST /access/scan`: resolve o código do Ticket contra o `venueId` selecionado na sessão do operador (sem vínculo fixo `User -> Venue`)
- Resposta clara: autorizado / já utilizado / inválido / local incorreto / horário incorreto / expirado (ACS-002), como seis outcomes distintos
- Local incorreto: comparação direta `venueId` da sessão vs `Order.venueId`, sem depender de Resource/Reservation
- Horário incorreto/expirado: aplicado apenas quando o `OrderLine` tem uma Reservation vinculada, comparando `Reservation.period` (antes do início = horário incorreto, depois do fim = expirado); produtos sem reserva (visita livre) não têm essa checagem
- Consumo atômico do entitlement (`issued -> consumed`) via UPDATE condicional, proteção contra double scanning (ACS-004/005)
- Toda tentativa de scan é registrada, autorizada ou não
- Nova permission `entitlement:consume` (`access_operator`, `owner`, `admin`)
- Sem UI de storefront/scanner (PWA/web) — apenas API; sem estratégia de conectividade intermitente (ACS-006, explicitamente futuro no PRD); sem tickets multi-uso (TKT-006, fora do MVP)

**Marco PRD: "primeiro visitante entrando utilizando exclusivamente a plataforma."** — atingível via API; falta a UI de scanner para operação real no piloto.

Change: `archive/2026-08-31-add-access-control`

### M6 — Dashboard mínimo ✅ concluído

- `GET /dashboard/summary`: GMV, ticket médio, pedidos por status e visitantes (scans autorizados), com filtro de venue e período
- Tela `/admin/dashboard`, landing page pós-login, com seletor de período (hoje/7d/30d/personalizado) e venue
- `GET /orders` e a tela `/admin/orders` ganharam filtro por id do pedido, cliente e status (fecha "localizar pedido", que ficava só como lista sem filtro desde o M3)
- Fecha o Definition of Done do MVP (PRD §43), itens 13-15

Change: `archive/2026-08-31-add-mvp-dashboard`

## Lançamento real (fecha as lacunas do teste final)

Todos os milestones de código (M1-M6) estão concluídos, mas o teste final do PRD §43 — **"uma pessoa real pagou, recebeu seu ingresso e entrou no estabelecimento sem alguém da equipe de desenvolvimento tocar no banco de dados"** — ainda não passa de ponta a ponta. Quatro lacunas de código (M7-M10 abaixo) e uma pendência operacional (Pix) ficaram registradas como "parcial" nos milestones anteriores e bloqueiam o piloto real. Sem elas, o MVP está "código-completo" mas não "piloto-pronto": um cliente real não consegue configurar, vender e validar ingressos usando *apenas* a plataforma, que é a promessa central do PRD (§30).

### M7 — Storefront: catálogo público (API) ✅ concluído

Nenhum endpoint de catálogo/venue/disponibilidade é público hoje — todos exigem `requireAuth` + permissão de staff (`product:read`, `venue:read`, `resource:read`). Sem uma leitura pública, um comprador real não consegue nem ver o que existe para comprar antes de chamar `POST /checkout`. **Pré-requisito de M8.**

- `GET /storefront/venues/:tenantId` — venues do tenant
- `GET /storefront/venues/:tenantId/:venueId/products` — produtos visíveis no canal `storefront` e dentro da janela de disponibilidade, com variantes e preço
- `GET /storefront/variants/:tenantId/:variantId/availability` — disponibilidade de capacidade (reaproveita `GetAvailableCapacityUseCase`)

Change: `add-storefront-catalog`

### M8 — Storefront: checkout UI ✅ concluído

PRD §30 lista "seleção; dados do cliente; reserva temporária" como escopo obrigatório do Checkout, e §9.6 (persona Consumidor) exige "utilizar o ticket sem instalar aplicativo" — uma tela pública, mobile-first, sem conta obrigatória. Hoje o checkout só existe via API (`POST /checkout`, `GET/cancel /orders/:id`, M2). Sem essa tela, nenhum comprador real consegue completar uma compra sozinho.

- Tela pública `/loja/[tenantId]/[venueId]`: navega o catálogo (M7) → carrinho (produto, quantidade, data de visita quando a variante é vinculada a capacidade) → dados do comprador → `POST /checkout` → `POST /orders/:id/submit-for-payment` → redireciona para a página de pagamento já existente (`/pay/[orderId]`)
- Falhas de checkout (capacidade insuficiente, dados inválidos) são exibidas sem descartar o carrinho nem os dados já preenchidos
- Catálogo vazio ou loja/venue inexistente mostram uma mensagem clara em vez de tela em branco

Change: `add-storefront-checkout-ui`

### M9 — Scanner de acesso (UI) ✅ concluído

PRD §30 exige explicitamente "PWA/web scanner" no escopo do Access, e §9.4 (persona Operador de acesso) precisa "validar QR Code rapidamente" e "operar com baixa conectividade". A validação de QR só existe via API (`POST /access/scan`, M5) — sem UI, o operador da portaria não consegue liberar entrada sem alguém tocar na API diretamente.

- Tela autenticada `/admin/scan`: seleção de venue, leitura por câmera ou digitação manual do código, exibição clara dos seis outcomes (autorizado / já utilizado / inválido / local incorreto / horário incorreto / expirado), pronta pro próximo scan sem navegação

Change: `add-access-scanner-ui`

### M10 — E-mail transacional (Resend)

PRD §25 lista *e-mail* como integração **P0** (bloqueante de lançamento). O envio de ticket por e-mail já está implementado via `EmailProviderPort` (M4), mas sem provedor real plugado — usa `NullEmailProvider`, que só registra `not_configured`.

- `ResendEmailProvider` implementando `EmailProviderPort`, plugado no lugar do `NullEmailProvider`
- Mantém `not_configured` como comportamento padrão quando `RESEND_API_KEY`/`RESEND_FROM_EMAIL` não estiverem setados — não quebra nenhum ambiente existente

Status: não iniciado

> **Pendência operacional (não é código):** Pix implementado no código mas desativado na conta Stripe usada (`payment_intent_invalid_parameter`, M3) — precisa ser habilitado no dashboard da Stripe. Da mesma forma, o Resend (M10) precisa de conta própria e domínio verificado antes de enviar e-mails de verdade em produção.

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

Cada milestone (M1–M10) vira uma OpenSpec change própria, seguindo a ordem recomendada do PRD (§40). Ao concluir um milestone:

1. Marque o status acima como `✅ concluído`.
2. Adicione a referência ao change/commit correspondente.
3. Não avance para o próximo milestone sem necessidade real — evite construir antecipadamente (PRD §37, risco R1).
