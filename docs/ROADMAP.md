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

## Em andamento (não bloqueia o MVP, mas está aberto)

- `auth-session-awareness` — `GET /auth/me`, middleware de rota protegida, nav com sessão, logout na UI (change proposta, implementação não iniciada)

## Já implementado dentro de Catalog/Capacity

- Catalog/Product — criação, variantes, preço, janela de disponibilidade, visibilidade por canal, auditoria
- Capacity/Resource — capacidade máxima, override por período, cálculo de disponibilidade, prevenção de overbooking, auditoria

---

## Milestones até o MVP

### M1 — Reservation
Fecha o lifecycle de capacidade que falta em `capacity/resource`.

- Lifecycle `available → held → reserved → consumed/expired` (PRD §17)
- Hold temporário durante checkout (CAP-006)
- Expiração automática de holds (CAP-007)
- **Pré-requisito de todos os milestones seguintes.**

Status: não iniciado

### M2 — Order + Checkout

- `order`: lifecycle `draft → awaiting_payment → paid → fulfilled → partially_refunded → refunded → cancelled → expired` (ORD-001/002/003), snapshot das condições comerciais no pedido
- Checkout público sem conta obrigatória (CHK-001), mobile-first (CHK-002)
- Servidor recalcula preço, nunca confia em valores do cliente (CHK-004)
- Prevenção de duplicidade acidental de pedido (CHK-005)

Status: não iniciado

### M3 — Payment

- Abstração de Payment Provider (PAY-001)
- Pix + cartão (PAY-002)
- Webhooks idempotentes (PAY-003)
- Nunca confirmar pagamento só pelo redirect do navegador (PAY-004)
- Suporte a reembolso (PAY-005)
- Trilha de auditoria em mudanças financeiras (PAY-006)

**Marco PRD: "primeiro R$1 processado."**

Status: não iniciado

### M4 — Entitlement + Ticket

- Emissão de entitlement ao `order.paid` (TKT-001)
- Ticket com identificador único e QR Code que referencia o direito, não é a regra de autorização (TKT-002/003/004)
- Envio de confirmação/ticket por e-mail (COM-001/002)

Status: não iniciado

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
