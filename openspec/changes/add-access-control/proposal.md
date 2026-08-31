## Why

O ciclo comercial termina em `paid -> Entitlement -> Ticket`, mas nada hoje consome um Entitlement na entrada do estabelecimento. Sem isso o marco do PRD "primeiro visitante entrando utilizando exclusivamente a plataforma" (Fase 2 "Enter") não é alcançável, e o Definition of Done do MVP (§43, itens 11-12) fica bloqueado.

## What Changes

- Novo endpoint de scan que recebe o código do Ticket e o `venueId` selecionado pelo operador para a sessão de scanner (não há vínculo fixo `User -> Venue`; o operador escolhe o venue no início do turno).
- Classificação de resposta clara por caso: autorizado, já utilizado, inválido, local incorreto, horário incorreto, expirado (ACS-002).
- Checagem de local: comparação direta entre `venueId` da sessão de scanner e o `venueId` do Order que originou o Entitlement — sem depender de Resource/Reservation.
- Checagem de horário/expiração: aplicada apenas quando o `OrderLine` do Entitlement tem uma Reservation vinculada (`reservationId` não nulo), comparando o período dessa Reservation com o momento do scan — antes do início é "horário incorreto", depois do fim é "expirado". Não há data de expiração própria no Entitlement; produtos sem reserva (visita livre dentro da janela do produto) não têm nenhuma dessas duas checagens.
- Consumo atômico do Entitlement: transição `issued -> consumed`, single-use (sem suporte a múltiplos usos por ticket neste change — TKT-006 fica fora do MVP), com proteção contra double scanning (duas tentativas concorrentes no mesmo Entitlement resultam em uma única consumida).
- Toda tentativa de scan é registrada (autorizada ou não), para auditoria e para permitir "já utilizado" em tentativas repetidas.
- Nova permission `entitlement:consume`, concedida a `access_operator`, `owner` e `admin`.
- Conectividade intermitente do scanner (ACS-006) fica fora deste change — estratégia futura, conforme o PRD já registra.

## Capabilities

### New Capabilities
- `access/scan`: sessão de scanner (seleção de venue pelo operador), validação de Ticket/Entitlement por código, classificação da resposta (autorizado/já utilizado/inválido/local incorreto/horário incorreto), registro de toda tentativa.

### Modified Capabilities
- `ticketing/entitlement`: o `status` do Entitlement passa a incluir `consumed` além de `issued`; a transição `issued -> consumed` é atômica, ocorre no máximo uma vez por Entitlement, e é a única forma de consumo (não há endpoint de consumo direto fora do fluxo de scan).

## Impact

- Backend: novo módulo/rotas de Access Control (scan), extensão de `Entitlement` (domain + repository) para o novo status e para o registro de tentativas de scan, nova permission em `authorization/domain/role.ts` e no `require-permission.middleware.ts` aplicado às novas rotas.
- Frontend: nenhuma UI de scanner (PWA/web) neste change de backend — a proposta cobre a API; a interface de scanner fica para implementação subsequente caso o escopo não seja incluído nas tasks.
- Dados: nova coluna/estado de status em `entitlement` e uma tabela/registro de tentativas de scan (para auditoria e detecção de "já utilizado").
