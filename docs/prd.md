# PRD — Commerce OS para Negócios Presenciais

**Status:** Draft
**Versão:** 0.1
**Tipo:** Product Requirements Document
**Horizonte:** MVP → Plataforma → Ecossistema
**Vertical inicial:** Atrações, turismo e entretenimento presencial
**Verticais futuras potenciais:** Veterinária, bem-estar, esportes, educação presencial, locação de espaços e outros negócios baseados em capacidade/reserva.

---

# 1. Resumo executivo

O produto será uma plataforma SaaS B2B destinada a negócios presenciais que precisam vender, reservar, cobrar, controlar capacidade, validar acesso e manter relacionamento recorrente com seus clientes.

A primeira vertical será composta por negócios como:

* zoológicos;
* aquários;
* museus;
* parques;
* atrações turísticas;
* fazendas turísticas;
* jardins botânicos;
* centros de visitação;
* parques aquáticos;
* espaços recreativos;
* experiências com horário ou capacidade limitada.

O produto não deverá ser desenvolvido como um simples “sistema de ingressos”.

A visão é construir uma infraestrutura operacional e comercial capaz de controlar progressivamente todo o ciclo:

**descoberta → oferta → reserva → compra → pagamento → emissão → acesso → experiência → relacionamento → recorrência → inteligência → nova compra.**

O sistema de ticketing será apenas o primeiro ponto de entrada.

O objetivo de longo prazo é formar um ecossistema no qual cada novo estabelecimento, consumidor e transação gere dados e distribuição que aumentem o valor entregue aos demais participantes.

---

# 2. Visão do produto

## 2.1 Visão

Ser a infraestrutura de commerce e operação utilizada por negócios presenciais para vender experiências, administrar capacidade, receber pagamentos, controlar acesso e construir relacionamento recorrente com seus clientes.

## 2.2 Evolução esperada

A evolução conceitual deverá seguir:

**Ticketing SaaS**

↓

**Booking & Capacity Platform**

↓

**Commerce OS**

↓

**Revenue & Customer Platform**

↓

**Distribution Network**

↓

**Marketplace**

O marketplace deverá ser consequência da existência de oferta suficiente dentro da plataforma e não o ponto inicial do negócio.

---

# 3. Problema

Negócios presenciais frequentemente utilizam sistemas isolados para:

* venda de ingressos;
* reservas;
* pagamentos;
* controle de entrada;
* emissão fiscal;
* CRM;
* campanhas;
* planos recorrentes;
* relatórios;
* gestão de grupos;
* atendimento.

Em operações menores, algumas dessas etapas ainda são realizadas utilizando:

* WhatsApp;
* e-mail;
* planilhas;
* maquininhas;
* controles manuais;
* sistemas legados;
* múltiplos fornecedores desconectados.

Isso gera:

* baixa visibilidade operacional;
* perda de receita;
* dificuldade de controlar capacidade;
* filas;
* conciliações manuais;
* dificuldade de entender comportamento de clientes;
* baixa recorrência;
* pouca automação;
* dados fragmentados;
* dificuldade de criar novos canais de venda.

---

# 4. Tese do produto

O maior valor não está em controlar ingressos.

O valor está em controlar a transação e o contexto operacional associado a ela.

Uma transação dentro da plataforma pode responder:

* quem comprou;
* o que comprou;
* para quando;
* para quem;
* quanto pagou;
* como pagou;
* qual capacidade consumiu;
* quando utilizou;
* se compareceu;
* quanto já gastou;
* quando provavelmente comprará novamente.

Essa combinação de dados transacionais e operacionais deverá ser utilizada progressivamente para melhorar:

* conversão;
* ocupação;
* recorrência;
* ticket médio;
* previsão de demanda;
* precificação;
* campanhas;
* experiência do consumidor.

---

# 5. Princípios de produto

## 5.1 API-first

As principais capacidades deverão possuir contratos explícitos e não depender exclusivamente das interfaces oficiais da plataforma.

## 5.2 Modularidade

Clientes deverão poder utilizar módulos diferentes sem necessariamente adotar todo o ecossistema.

Exemplos:

* somente ticketing;
* ticketing + pagamentos;
* ticketing + access control;
* booking + pagamentos;
* booking + memberships.

## 5.3 Single Source of Truth

Regras críticas de negócio deverão possuir um único proprietário.

Exemplo:

Capacidade disponível não deverá ser recalculada independentemente pelo frontend, checkout e access control.

## 5.4 Multi-tenant desde a fundação

Toda entidade pertencente a clientes deverá possuir isolamento explícito por organização/tenant.

## 5.5 Verticalização através de configuração

O núcleo deverá permanecer relativamente genérico.

Características específicas de zoológicos, museus ou outras verticais devem, sempre que possível, ser implementadas através de:

* configurações;
* políticas;
* tipos de recursos;
* tipos de produtos;
* regras de capacidade;
* extensões.

## 5.6 Transações antes de IA

IA deverá melhorar operações já existentes.

IA não deverá substituir regras determinísticas relacionadas a:

* pagamentos;
* capacidade;
* acesso;
* reservas;
* autorização;
* cobrança;
* documentos fiscais.

## 5.7 Dados como ativo

Eventos importantes deverão ser armazenados de forma que possam alimentar futuramente:

* analytics;
* CRM;
* previsão;
* segmentação;
* recomendações;
* pricing.

## 5.8 Automação sem perda de controle

Automação deverá possuir:

* histórico;
* rastreabilidade;
* possibilidade de desativação;
* critérios explícitos;
* mecanismos de proteção contra duplicidade.

---

# 6. Objetivos

## 6.1 Objetivos de curto prazo

1. Permitir que um estabelecimento venda ingressos online.
2. Permitir controle de capacidade por data/horário.
3. Receber pagamento.
4. Emitir ticket digital.
5. Validar acesso através de QR Code.
6. Disponibilizar visão básica de vendas e acessos.
7. Operar sem necessidade de hardware proprietário.

## 6.2 Objetivos de médio prazo

1. Criar memberships e passes.
2. Automatizar emissão fiscal.
3. Gerenciar grupos e excursões.
4. Criar CRM baseado em comportamento.
5. Melhorar conciliação financeira.
6. Criar inteligência de ocupação e receita.
7. Abrir APIs e integrações.

## 6.3 Objetivos de longo prazo

1. Agregar inventário de centenas ou milhares de estabelecimentos.
2. Criar um canal próprio de distribuição.
3. Permitir cross-selling entre estabelecimentos.
4. Criar marketplace.
5. Desenvolver motores de recomendação.
6. Desenvolver revenue management.
7. Criar novos produtos financeiros e operacionais sobre a camada transacional.

---

# 7. Não objetivos iniciais

Não fazem parte do MVP:

* ERP completo;
* contabilidade;
* folha de pagamento;
* gestão de RH;
* sistema completo de alimentação;
* gestão completa de estoque;
* CRM genérico;
* marketplace;
* programa de fidelidade complexo;
* precificação dinâmica;
* hardware proprietário;
* reconhecimento facial;
* aplicativo mobile nativo;
* IA generativa para atendimento;
* suporte profundo a múltiplas verticais.

Essas funcionalidades somente deverão entrar após evidência concreta de necessidade.

---

# 8. Público-alvo

## 8.1 ICP inicial

Negócios presenciais que:

* vendem entrada ou experiência;
* possuem capacidade limitada;
* atendem público recorrente ou sazonal;
* precisam receber pagamentos;
* possuem algum processo de check-in;
* realizam vendas online ou desejam realizá-las.

### Faixa inicial recomendada

Empresas pequenas e médias que não possuem:

* ERP altamente customizado;
* equipe própria significativa de tecnologia;
* contratos rígidos com grandes fornecedores.

---

# 9. Personas

## 9.1 Administrador do estabelecimento

Responsável pela configuração geral.

Necessidades:

* administrar usuários;
* visualizar vendas;
* configurar produtos;
* acompanhar operação;
* configurar integrações.

---

## 9.2 Operador financeiro

Necessidades:

* visualizar pagamentos;
* identificar divergências;
* acompanhar reembolsos;
* gerar relatórios;
* conciliar valores.

---

## 9.3 Operador de bilheteria

Necessidades:

* realizar vendas;
* localizar pedidos;
* reenviar ingressos;
* alterar reservas quando permitido;
* registrar pagamentos presenciais.

---

## 9.4 Operador de acesso

Necessidades:

* validar QR Code rapidamente;
* identificar tickets inválidos;
* visualizar informações mínimas necessárias;
* operar com baixa conectividade.

---

## 9.5 Gestor comercial

Necessidades:

* acompanhar vendas;
* analisar ocupação;
* criar promoções;
* acompanhar canais;
* entender comportamento dos clientes.

---

## 9.6 Consumidor

Necessidades:

* localizar disponibilidade;
* selecionar data;
* selecionar ingresso;
* pagar rapidamente;
* receber ticket;
* utilizar o ticket sem instalar aplicativo.

---

## 9.7 Organizador de grupo

Exemplos:

* escola;
* empresa;
* agência;
* excursão.

Necessidades:

* consultar disponibilidade;
* solicitar orçamento;
* reservar capacidade;
* informar quantidade de participantes;
* pagar;
* receber documentos e ingressos.

---

# 10. Flywheel

O principal flywheel deverá ser:

**Mais estabelecimentos**

↓

**Mais inventário**

↓

**Mais transações**

↓

**Mais dados**

↓

**Melhor inteligência**

↓

**Melhor conversão e receita**

↓

**Maior valor para estabelecimentos**

↓

**Maior retenção**

↓

**Mais estabelecimentos**

Em estágio posterior:

**Mais estabelecimentos**

↓

**Mais experiências disponíveis**

↓

**Marketplace mais relevante**

↓

**Mais consumidores**

↓

**Mais vendas**

↓

**Mais estabelecimentos interessados**

---

# 11. Modelo de negócio

A plataforma deverá suportar combinações de monetização.

## 11.1 Assinatura SaaS

Mensalidade por estabelecimento ou organização.

Possíveis dimensões:

* número de locais;
* volume de vendas;
* número de operadores;
* funcionalidades habilitadas.

---

# 11.2 Fee por transação

Percentual ou valor fixo aplicado às vendas realizadas através da plataforma.

Exemplo conceitual:

**GMV × percentual da plataforma**

---

# 11.3 Receita de pagamentos

Caso a plataforma evolua para modelo de pagamentos integrado:

* markup;
* revenue share;
* antecipação;
* serviços financeiros.

---

# 11.4 Módulos premium

Possíveis módulos:

* memberships;
* CRM;
* fiscal;
* analytics avançado;
* grupos;
* revenue intelligence.

---

# 11.5 Marketplace

Possível modelo futuro:

* comissão;
* sponsored placement;
* distribuição afiliada;
* bundles.

---

# 12. Estrutura conceitual da plataforma

A plataforma deverá ser composta pelas seguintes camadas.

## Foundation

* Organization
* Identity
* Authorization
* Tenant
* Configuration
* Audit

## Commerce

* Catalog
* Product
* Offer
* Pricing
* Order
* Checkout

## Capacity

* Resource
* Schedule
* Availability
* Slot
* Reservation

## Payments

* Payment
* Refund
* Settlement
* Reconciliation

## Fulfillment

* Ticket
* Entitlement
* QR Code
* Access Validation

## Recurrence

* Plan
* Membership
* Subscription
* Benefit

## Customer

* Customer
* Profile
* Interaction
* Segment

## Fiscal

* Fiscal Document
* Invoice
* Cancellation

## Intelligence

* Events
* Metrics
* Analytics
* Forecast

## Distribution

* Inventory
* Channel
* Marketplace

---

# 13. Modelo de domínio conceitual

## Organization

Representa uma empresa cliente da plataforma.

Possui:

* usuários;
* estabelecimentos;
* produtos;
* configurações;
* integrações;
* dados financeiros.

---

## Venue

Representa um estabelecimento físico.

Exemplos:

* Zoológico Municipal;
* Museu Central;
* Parque Aquático Unidade Norte.

Uma Organization poderá possuir múltiplos Venues.

---

## Customer

Representa o consumidor.

Dados possíveis:

* nome;
* e-mail;
* telefone;
* documento;
* consentimentos;
* histórico.

O modelo deverá evitar duplicação excessiva de clientes.

---

## Resource

Algo cuja capacidade precisa ser administrada.

Exemplos:

* estabelecimento;
* sessão;
* passeio;
* sala;
* tour;
* profissional;
* veículo.

---

## Product

Aquilo que é comercializado.

Exemplos:

* ingresso adulto;
* ingresso infantil;
* visita guiada;
* passe anual;
* pacote escolar.

---

## Offer

Representa condições comerciais aplicadas ao produto.

Pode definir:

* preço;
* validade;
* canal;
* período;
* público;
* desconto.

---

## Availability

Representa disponibilidade de um recurso.

---

## Reservation

Representa retenção ou consumo planejado de capacidade.

Deverá possuir ciclo de vida explícito.

Exemplo:

* pending;
* confirmed;
* expired;
* cancelled;
* consumed.

---

## Order

Representa intenção comercial de compra.

Um Order poderá possuir múltiplos Order Items.

---

## Payment

Representa uma tentativa ou transação financeira associada ao pedido.

O sistema deverá aceitar múltiplas tentativas para um mesmo pedido.

---

## Entitlement

Representa o direito adquirido pelo cliente.

Exemplos:

* uma entrada;
* dez entradas;
* acesso ilimitado por um ano.

---

## Ticket

Manifestação utilizável de um Entitlement.

Um QR Code deverá referenciar o direito de acesso e não ser a própria regra de autorização.

---

## Access

Representa uma tentativa de utilização de um Entitlement.

Deverá registrar:

* horário;
* local;
* operador/dispositivo;
* resultado;
* motivo da recusa.

---

## Membership

Relaciona um cliente a determinado programa recorrente.

---

## Subscription

Representa contrato de cobrança recorrente.

Membership e Subscription não deverão obrigatoriamente ser a mesma entidade.

Exemplo:

uma assinatura pode financiar um membership familiar.

---

# 14. Requisitos funcionais

# 14.1 Organizations

### ORG-001

O sistema deverá permitir criação de organizações.

### ORG-002

Uma organização poderá possuir múltiplos estabelecimentos.

### ORG-003

Dados pertencentes a organizações diferentes deverão permanecer isolados.

### ORG-004

Uma organização deverá possuir configurações próprias.

---

# 14.2 Identity & Access Management

### IAM-001

O sistema deverá possuir autenticação de usuários administrativos.

### IAM-002

O sistema deverá suportar RBAC.

Papéis iniciais:

* Owner;
* Admin;
* Finance;
* Sales;
* Operator;
* Access Operator;
* Read Only.

### IAM-003

Permissões críticas deverão ser verificadas no backend.

### IAM-004

Operações sensíveis deverão possuir auditoria.

---

# 14.3 Catalog

### CAT-001

Usuários autorizados poderão criar produtos.

### CAT-002

Produtos poderão possuir variantes.

### CAT-003

Produtos poderão possuir períodos de disponibilidade.

### CAT-004

Produtos poderão possuir regras específicas por canal.

### CAT-005

Produtos poderão possuir preços diferentes.

---

# 14.4 Capacity

### CAP-001

O sistema deverá permitir criação de recursos controlados.

### CAP-002

Um recurso poderá possuir capacidade máxima.

### CAP-003

Capacidade poderá variar por período.

### CAP-004

O sistema deverá calcular capacidade disponível.

### CAP-005

O sistema deverá impedir overbooking quando configurado para capacidade rígida.

### CAP-006

Deverá ser possível reservar capacidade temporariamente durante checkout.

### CAP-007

Reservas temporárias deverão expirar automaticamente.

---

# 14.5 Booking

### BKG-001

Clientes deverão visualizar datas disponíveis.

### BKG-002

Clientes deverão visualizar horários disponíveis quando aplicável.

### BKG-003

O sistema deverá permitir reservas.

### BKG-004

Reservas deverão possuir estado explícito.

### BKG-005

Alterações deverão respeitar políticas definidas pelo estabelecimento.

---

# 14.6 Checkout

### CHK-001

O checkout deverá funcionar sem criação obrigatória de conta.

### CHK-002

Deverá ser otimizado para dispositivos móveis.

### CHK-003

O cliente deverá visualizar claramente:

* itens;
* data;
* horário;
* quantidade;
* taxas;
* descontos;
* total.

### CHK-004

O servidor deverá recalcular valores antes da criação do pedido.

Nunca deverá confiar em preços enviados pelo cliente.

### CHK-005

O sistema deverá prevenir duplicidade acidental de pedidos.

---

# 14.7 Orders

### ORD-001

Pedidos deverão possuir lifecycle explícito.

Possíveis estados:

* draft;
* awaiting_payment;
* paid;
* fulfilled;
* partially_refunded;
* refunded;
* cancelled;
* expired.

### ORD-002

Mudanças de estado deverão ser registradas.

### ORD-003

Pedido deverá manter snapshot das condições comerciais utilizadas na compra.

---

# 14.8 Payments

### PAY-001

O sistema deverá possuir abstração de Payment Provider.

### PAY-002

O MVP deverá suportar pelo menos:

* Pix;
* cartão.

### PAY-003

Webhooks de pagamentos deverão ser idempotentes.

### PAY-004

O sistema nunca deverá depender exclusivamente do redirect do navegador para confirmar pagamento.

### PAY-005

Deverá existir suporte a reembolso.

### PAY-006

Todas as mudanças financeiras deverão possuir trilha de auditoria.

---

# 14.9 Tickets

### TKT-001

Após confirmação da compra, os entitlements correspondentes deverão ser emitidos.

### TKT-002

Tickets deverão possuir identificador único.

### TKT-003

Cada ticket poderá possuir QR Code.

### TKT-004

QR Codes não deverão expor informações sensíveis.

### TKT-005

Tickets poderão possuir período de validade.

### TKT-006

Tickets poderão possuir limite de utilizações.

---

# 14.10 Access Control

### ACS-001

O sistema deverá validar tickets através de QR Code.

### ACS-002

A resposta deverá indicar claramente:

* autorizado;
* já utilizado;
* inválido;
* expirado;
* local incorreto;
* horário incorreto.

### ACS-003

A validação deverá ser rápida o suficiente para não provocar filas perceptíveis.

### ACS-004

Uma utilização confirmada deverá ser atomicamente registrada.

### ACS-005

O sistema deverá possuir proteção contra double scanning.

### ACS-006

Deverá existir estratégia futura para conectividade intermitente.

---

# 14.11 Comunicação

### COM-001

O sistema deverá enviar confirmação de compra.

### COM-002

Deverá ser possível reenviar ingressos.

### COM-003

Canais iniciais:

* e-mail.

Canais futuros:

* WhatsApp;
* push;
* SMS.

### COM-004

Comunicações transacionais e promocionais deverão ser tratadas separadamente.

---

# 14.12 Groups

### GRP-001

Clientes B2B deverão poder solicitar reserva para grupos.

### GRP-002

Uma reserva de grupo deverá possuir:

* organização solicitante;
* contato;
* quantidade;
* data;
* horário;
* condições comerciais.

### GRP-003

O fluxo poderá exigir aprovação manual.

### GRP-004

Uma reserva aprovada deverá bloquear capacidade.

### GRP-005

O sistema deverá permitir pagamento posterior quando configurado.

---

# 14.13 Membership

### MEM-001

Estabelecimentos deverão poder criar programas de membership.

### MEM-002

Um plano poderá oferecer benefícios.

Exemplos:

* entradas;
* acesso ilimitado;
* descontos;
* prioridade;
* produtos exclusivos.

### MEM-003

Benefícios deverão ser representados como regras/entitlements e não condicionais espalhadas pelo sistema.

### MEM-004

Membership deverá possuir:

* início;
* expiração;
* status.

---

# 14.14 Subscription

### SUB-001

O sistema deverá permitir recorrência.

### SUB-002

Assinaturas deverão possuir lifecycle independente dos memberships.

### SUB-003

Falha de pagamento deverá permitir política configurável.

Exemplos:

* retry;
* grace period;
* suspensão.

---

# 14.15 Fiscal

### FSC-001

Pagamentos elegíveis poderão gerar documentos fiscais.

### FSC-002

Emissão deverá acontecer de forma assíncrona.

### FSC-003

Falha fiscal não deverá necessariamente invalidar uma compra confirmada.

### FSC-004

O sistema deverá suportar retry.

### FSC-005

Todo documento deverá possuir histórico.

---

# 14.16 Customer 360

### CRM-001

A plataforma deverá manter histórico consolidado do consumidor.

Deverá ser possível visualizar:

* compras;
* visitas;
* cancelamentos;
* memberships;
* valor gasto.

### CRM-002

Dados deverão ser utilizáveis para segmentação futura.

---

# 14.17 Automations

Exemplos futuros:

**Cliente visitou três vezes em seis meses**

→ sugerir membership.

**Não visita há doze meses**

→ campanha de retorno.

**Aniversário próximo**

→ oferta.

### AUT-001

Automações deverão possuir trigger.

### AUT-002

Automações deverão possuir condições.

### AUT-003

Automações deverão possuir ação.

### AUT-004

Execuções deverão ser auditáveis.

---

# 14.18 Analytics

Dashboard inicial deverá mostrar:

* GMV;
* pedidos;
* ingressos vendidos;
* visitantes;
* taxa de comparecimento;
* ticket médio;
* vendas por período;
* vendas por produto.

Evolução:

* ocupação;
* receita por slot;
* receita por visitante;
* recorrência;
* LTV;
* cohort;
* cancelamento;
* conversão.

---

# 15. Fluxo principal do consumidor

## Fluxo de compra

1. Consumidor acessa página.
2. Seleciona experiência.
3. Seleciona data.
4. Seleciona horário quando necessário.
5. Sistema consulta disponibilidade.
6. Consumidor seleciona quantidade.
7. Sistema calcula preço.
8. Capacidade é temporariamente reservada.
9. Consumidor informa dados.
10. Pedido é criado.
11. Consumidor escolhe forma de pagamento.
12. Pagamento é iniciado.
13. Provider confirma pagamento.
14. Pedido muda para `paid`.
15. Reserva é confirmada.
16. Entitlements são emitidos.
17. Tickets são gerados.
18. Consumidor recebe confirmação.

---

# 16. Fluxo de acesso

1. Visitante apresenta QR Code.
2. Operador escaneia QR Code.
3. Sistema identifica entitlement.
4. Sistema verifica:

   * validade;
   * local;
   * horário;
   * quantidade de usos;
   * status.
5. Sistema registra tentativa.
6. Em caso positivo, utilização é consumida.
7. Interface retorna autorização.

Meta operacional:

**o processo deverá ser rápido o suficiente para permitir fluxo contínuo de pessoas.**

---

# 17. Lifecycle de capacidade

Capacidade é um recurso crítico.

Estados conceituais:

**Available**

↓

**Held**

↓

**Reserved**

↓

**Consumed**

Uma compra poderá temporariamente produzir:

`available → held`

Caso o pagamento seja confirmado:

`held → reserved`

Caso o checkout expire:

`held → available`

Após utilização:

`reserved → consumed`

Esse comportamento deverá ser consistente mesmo na presença de:

* múltiplas instâncias;
* webhooks duplicados;
* retries;
* requisições concorrentes.

---

# 18. Requisitos não funcionais

# 18.1 Segurança

A plataforma deverá seguir princípios de:

* least privilege;
* defense in depth;
* secure by default;
* explicit authorization;
* zero trust entre componentes críticos quando aplicável.

---

# 18.2 Autorização

Toda operação sobre entidade de tenant deverá validar:

1. identidade;
2. organização;
3. permissão;
4. ownership quando aplicável.

---

# 18.3 Idempotência

Operações críticas deverão suportar idempotência.

Especialmente:

* criação de pagamento;
* processamento de webhook;
* emissão de ticket;
* reembolso;
* criação de reserva;
* emissão fiscal.

---

# 18.4 Concorrência

O sistema deverá prevenir condições de corrida envolvendo:

* capacidade;
* utilização de tickets;
* cupons;
* estoque futuro;
* reservas.

---

# 18.5 Auditoria

Devem possuir audit log:

* alterações de preço;
* cancelamentos;
* reembolsos;
* alterações de capacidade;
* configurações;
* permissões;
* acesso administrativo;
* ações manuais sobre pedidos.

---

# 18.6 Performance

Metas iniciais sugeridas.

### APIs administrativas

p95 < 500 ms.

### APIs transacionais críticas

p95 < 300 ms quando dependências externas não estiverem envolvidas.

### Validação de acesso

Objetivo:

p95 < 200 ms.

---

# 18.7 Disponibilidade

O sistema deverá priorizar disponibilidade especialmente para:

* checkout;
* pagamentos;
* access control.

---

# 18.8 Escalabilidade

A arquitetura deverá permitir aumento independente de capacidade de componentes de alta demanda.

Principais picos esperados:

* abertura de vendas;
* campanhas;
* início de sessões;
* horários de entrada;
* eventos especiais.

---

# 18.9 Resiliência

Integrações externas deverão possuir políticas de:

* timeout;
* retry;
* circuit breaking quando necessário;
* idempotência;
* dead letter;
* observabilidade.

---

# 19. LGPD e privacidade

A plataforma deverá permitir identificar:

* finalidade dos dados coletados;
* consentimento quando aplicável;
* origem;
* período de retenção.

O sistema deverá possibilitar:

* anonimização;
* exclusão quando legalmente possível;
* exportação;
* gerenciamento de consentimentos.

Dados de pagamento sensíveis não deverão ser armazenados quando puderem permanecer tokenizados no payment provider.

---

# 20. Observabilidade

Todo fluxo crítico deverá possuir correlação ponta a ponta.

Especialmente:

**checkout → order → payment → reservation → entitlement → ticket.**

Cada operação deverá gerar:

* logs estruturados;
* métricas;
* traces;
* identificadores correlacionáveis.

---

# 21. Eventos de domínio

A plataforma deverá começar cedo a produzir eventos úteis.

Exemplos:

`customer.created`

`reservation.created`

`reservation.expired`

`order.created`

`order.paid`

`payment.failed`

`payment.refunded`

`entitlement.created`

`ticket.issued`

`access.approved`

`access.denied`

`membership.created`

`subscription.renewed`

Esses eventos deverão permitir posteriormente adicionar funcionalidades sem aumentar o acoplamento do core.

---

# 22. Analytics de produto

Eventos de comportamento também deverão ser coletados.

Exemplos:

* product_viewed;
* date_selected;
* slot_selected;
* checkout_started;
* payment_method_selected;
* checkout_completed;
* checkout_abandoned.

Isso permitirá construir funil:

**visualização**

↓

**seleção**

↓

**checkout**

↓

**pagamento**

↓

**visita**

---

# 23. APIs

A plataforma deverá expor APIs para capacidades centrais.

Possíveis grupos:

`/organizations`

`/venues`

`/customers`

`/products`

`/availability`

`/reservations`

`/orders`

`/payments`

`/tickets`

`/access`

`/memberships`

APIs públicas deverão possuir versionamento e política explícita de compatibilidade.

---

# 24. Webhooks

Clientes deverão poder integrar sistemas externos.

Eventos possíveis:

* order.created;
* order.paid;
* reservation.confirmed;
* ticket.used;
* payment.refunded.

Webhooks deverão possuir:

* assinatura;
* retry;
* histórico;
* status;
* proteção contra replay;
* idempotência.

---

# 25. Integrações

## P0

* payment provider;
* e-mail.

## P1

* NFS-e;
* WhatsApp;
* analytics.

## P2

* ERPs;
* catracas;
* parceiros de distribuição;
* sistemas turísticos.

---

# 26. Backoffice interno

A operação da própria plataforma deverá possuir console administrativo.

Deverá permitir:

* localizar organização;
* localizar pedido;
* verificar pagamentos;
* verificar eventos;
* investigar falhas;
* consultar audit log;
* executar operações de suporte controladas.

Toda impersonation ou operação administrativa deverá possuir auditoria rigorosa.

---

# 27. Feature flags

Funcionalidades de alto risco deverão poder ser habilitadas gradualmente.

Exemplos:

* memberships;
* fiscal;
* grupos;
* novos meios de pagamento;
* pricing experimental.

Flags deverão possuir escopo potencial por:

* ambiente;
* organização;
* estabelecimento;
* usuário.

---

# 28. Métricas de negócio

## North Star inicial

**GMV processado através da plataforma.**

Essa métrica conecta diretamente:

* adoção;
* uso;
* receita dos clientes;
* receita potencial da plataforma.

---

## Métricas complementares

### Aquisição

* organizações criadas;
* organizações ativadas;
* CAC;
* tempo até primeira venda.

### Engajamento

* pedidos/mês;
* tickets/mês;
* operadores ativos;
* frequência de uso.

### Receita

* MRR;
* ARR;
* GMV;
* take rate;
* ARPA.

### Retenção

* logo churn;
* revenue churn;
* NRR;
* retenção em 3/6/12 meses.

### Produto

* conversão checkout;
* payment success rate;
* abandono;
* taxa de visitas;
* ticket médio.

---

# 29. Critério de ativação de cliente

Uma organização será considerada ativada quando completar:

1. criação do estabelecimento;
2. criação de pelo menos um produto;
3. configuração de disponibilidade;
4. configuração de pagamento;
5. primeira venda real.

Métrica:

**Time To First Transaction.**

Deverá ser reduzida progressivamente.

---

# 30. MVP

O MVP deverá provar:

> “Um estabelecimento consegue configurar, vender e validar ingressos utilizando apenas nossa plataforma.”

## Escopo obrigatório

### Administração

* Organization;
* Venue;
* usuários;
* RBAC básico.

### Catálogo

* produto;
* preço;
* disponibilidade.

### Capacity

* capacidade por data;
* slots opcionais.

### Checkout

* seleção;
* dados do cliente;
* reserva temporária.

### Orders

* criação;
* acompanhamento.

### Payment

* Pix;
* cartão.

### Ticketing

* emissão;
* QR Code;
* envio por e-mail.

### Access

* PWA/web scanner;
* validação;
* consumo do ticket.

### Dashboard

* vendas;
* pedidos;
* visitantes.

---

# 31. Explicitamente fora do MVP

* marketplace;
* veterinária;
* IA;
* loyalty points;
* gift cards;
* dynamic pricing;
* fiscal completo;
* memberships;
* CRM avançado;
* integrações com catracas;
* aplicativo mobile;
* white label profundo;
* múltiplas moedas;
* múltiplos países.

---

# 32. Roadmap

## Fase 0 — Foundation

Objetivo:

criar fundação sem construir abstrações prematuras.

Entregas:

* organization;
* venue;
* identity;
* RBAC;
* audit;
* configuration.

---

# Fase 1 — Sell

Objetivo:

processar primeira venda real.

Entregas:

* catalog;
* capacity;
* availability;
* booking;
* checkout;
* order;
* payment.

Marco:

**primeiro R$1 processado.**

---

# Fase 2 — Enter

Objetivo:

fechar o ciclo físico.

Entregas:

* entitlement;
* ticket;
* QR;
* access scanner;
* validation.

Marco:

**primeiro visitante entrando utilizando exclusivamente a plataforma.**

---

# Fase 3 — Operate

Entregas:

* dashboards;
* refunds;
* relatórios;
* audit avançado;
* atendimento;
* grupos;
* melhorias operacionais.

---

# Fase 4 — Retain

Entregas:

* memberships;
* subscriptions;
* benefícios;
* Customer 360;
* segmentação;
* automações.

---

# Fase 5 — Optimize

Entregas:

* ocupação;
* forecasting;
* revenue analytics;
* pricing recommendations.

---

# Fase 6 — Distribute

Entregas:

* inventory API;
* channel management;
* parceiros;
* marketplace.

---

# 33. Critérios para avançar entre fases

Novas fases não deverão ser iniciadas simplesmente porque o roadmap existe.

## Fase 1 → Fase 2

Exigir:

* clientes utilizando vendas;
* volume transacional real.

## Fase 2 → Fase 3

Exigir:

* utilização real do access control;
* evidência de necessidades operacionais.

## Fase 3 → Fase 4

Exigir:

* base significativa de consumidores;
* sinais de recorrência.

## Fase 4 → Fase 5

Exigir:

* dados históricos suficientes.

## Fase 5 → Fase 6

Exigir:

* oferta suficiente para justificar distribuição.

---

# 34. Estratégia de verticalização

O domínio deverá ser desenhado em torno de conceitos reutilizáveis.

Evitar:

`ZooTicket`

Preferir:

`Ticket`

Evitar:

`ZooVisitor`

Preferir:

`Customer`

Evitar:

`ZooCapacity`

Preferir:

`ResourceCapacity`

Entretanto, generalizações somente deverão ser introduzidas quando possuírem uso concreto.

Não deverá ser criado um modelo universal capaz de administrar zoológico, clínica, estacionamento, foguete espacial e casamento cigano antes do primeiro cliente.

---

# 35. Possível expansão para veterinária

A vertical veterinária poderá futuramente reutilizar:

* Organization;
* Customer;
* Resource;
* Availability;
* Reservation;
* Order;
* Payment;
* Subscription;
* Fiscal.

Extensões específicas seriam necessárias.

Exemplos:

* Pet;
* Veterinarian;
* Medical Record;
* Procedure;
* Prescription.

Essa vertical não deverá influenciar excessivamente o MVP de atrações.

A abstração deverá nascer do que realmente for compartilhado, não de especulação.

---

# 36. Uso de IA

IA deverá ser introduzida somente onde houver dados ou processos suficientes.

Possíveis usos futuros:

### Forecast

Previsão de demanda.

### Revenue

Sugestão de preço.

### CRM

Sugestão de segmentos.

### Support

Resumo de histórico do cliente.

### Operations

Detecção de anomalias.

### Marketing

Geração de campanhas.

IA nunca deverá ter autonomia irrestrita para:

* movimentar dinheiro;
* reembolsar;
* alterar capacidade;
* conceder acesso;
* cancelar reservas.

---

# 37. Riscos

## R1 — Construção excessiva antes de vendas

Mitigação:

MVP pequeno e clientes piloto.

---

## R2 — Generalização prematura

Mitigação:

vertical inicial explícita.

---

## R3 — Complexidade financeira

Mitigação:

utilizar PSP estabelecido inicialmente.

---

## R4 — Corrida de capacidade

Mitigação:

modelagem explícita de reserva e concorrência.

---

## R5 — Dependência de terceiros

Mitigação:

adapters e contratos internos.

---

## R6 — Plataforma virar ERP

Mitigação:

manter foco em commerce, capacidade, acesso e relacionamento.

---

## R7 — Marketplace prematuro

Mitigação:

somente iniciar após existir oferta suficiente dentro da plataforma.

---

# 38. Decisões que deverão possuir ADR

Algumas decisões técnicas deverão ser registradas formalmente.

Sugestões:

### ADR-001

Estratégia multi-tenant.

### ADR-002

Ownership de Customer.

### ADR-003

Modelo de capacidade.

### ADR-004

Consistência de reservas.

### ADR-005

Idempotência.

### ADR-006

Payment abstraction.

### ADR-007

Modelo de entitlement.

### ADR-008

QR Code e segurança.

### ADR-009

Modelo de eventos.

### ADR-010

Arquitetura de comunicação assíncrona.

### ADR-011

Estratégia de audit log.

### ADR-012

Estratégia offline do access control.

---

# 39. Especificações derivadas

Este PRD deverá ser quebrado em especificações menores.

Estrutura recomendada:

```text
specs/

  foundation/
    organization.md
    venues.md
    identity.md
    authorization.md
    audit.md

  catalog/
    products.md
    pricing.md
    offers.md

  capacity/
    resources.md
    availability.md
    reservations.md

  commerce/
    checkout.md
    orders.md

  payments/
    payments.md
    refunds.md
    reconciliation.md

  fulfillment/
    entitlements.md
    tickets.md
    access-control.md

  memberships/
    memberships.md
    subscriptions.md
    benefits.md

  customers/
    customer-profile.md
    segmentation.md
    automations.md

  fiscal/
    fiscal-documents.md

  analytics/
    events.md
    metrics.md
    revenue-intelligence.md

  distribution/
    channels.md
    inventory-api.md
    marketplace.md
```

---

# 40. Ordem recomendada de especificação

Não especificar tudo simultaneamente.

A sequência recomendada é:

### 1.

Organization / Venue

### 2.

Identity / Authorization

### 3.

Catalog / Product

### 4.

Resource / Capacity

### 5.

Availability

### 6.

Reservation

### 7.

Order

### 8.

Checkout

### 9.

Payment

### 10.

Entitlement

### 11.

Ticket

### 12.

Access Control

### 13.

Notifications

### 14.

Analytics

Somente depois:

### 15.

Groups

### 16.

Memberships

### 17.

Subscriptions

### 18.

Fiscal

### 19.

CRM

### 20.

Revenue Intelligence

### 21.

Distribution

### 22.

Marketplace

---

# 41. Perguntas que cada especificação deverá responder

Toda specification derivada deverá conter:

## Problema

Qual problema está sendo resolvido?

## Contexto

Por que essa funcionalidade existe?

## Escopo

O que está incluído?

## Fora de escopo

O que explicitamente não será resolvido?

## Atores

Quem utiliza?

## Domínio

Quais entidades estão envolvidas?

## Invariantes

O que nunca pode acontecer?

## Estados

Qual lifecycle existe?

## Fluxos

Quais happy paths existem?

## Edge cases

Quais situações excepcionais existem?

## Concorrência

Existem operações simultâneas problemáticas?

## Idempotência

Existe risco de repetição?

## Segurança

Quem pode executar cada ação?

## Auditoria

O que precisa ser registrado?

## Eventos

Quais eventos são produzidos?

## APIs

Quais contratos são necessários?

## Dados

Quais informações precisam ser persistidas?

## Observabilidade

Como saberemos que está funcionando?

## Métricas

Como mediremos sucesso?

## Failure modes

Como o componente pode falhar?

## Acceptance Criteria

Como saberemos que terminou?

---

# 42. Invariantes globais

Algumas regras deverão ser consideradas fundamentais.

### INV-001

Uma organização nunca poderá acessar dados privados de outra organização.

### INV-002

O sistema nunca poderá confirmar pagamento somente baseado em informação fornecida pelo frontend.

### INV-003

Um ticket single-use nunca poderá ser consumido duas vezes.

### INV-004

Capacidade rígida nunca poderá ultrapassar o limite configurado.

### INV-005

Webhooks repetidos nunca poderão gerar efeitos duplicados.

### INV-006

Valores históricos de pedidos não deverão mudar quando preços atuais forem alterados.

### INV-007

Toda operação financeira deverá ser rastreável.

### INV-008

Toda operação administrativa crítica deverá possuir ator identificável.

---

# 43. Definition of Done do MVP

O MVP somente poderá ser considerado funcional quando um estabelecimento piloto puder executar sem intervenção técnica:

1. cadastrar sua empresa;
2. cadastrar estabelecimento;
3. cadastrar produto;
4. configurar preço;
5. configurar capacidade;
6. publicar oferta;
7. receber comprador;
8. aceitar pagamento real;
9. emitir ticket;
10. enviar ticket;
11. escanear QR Code;
12. liberar entrada;
13. visualizar venda;
14. localizar pedido;
15. acompanhar número de visitantes.

O teste final do produto não será:

> “A API respondeu 200.”

Será:

> **“Uma pessoa real pagou, recebeu seu ingresso e entrou no estabelecimento sem alguém da equipe de desenvolvimento tocar no banco de dados.”**

---

# 44. Resultado estratégico esperado

Ao final da primeira etapa, o negócio terá um SaaS de ticketing.

Ao final das etapas seguintes, deverá possuir algo estruturalmente diferente:

**uma camada transacional entre negócios presenciais e seus consumidores.**

Essa camada deverá concentrar:

* clientes;
* inventário;
* disponibilidade;
* pedidos;
* pagamentos;
* acesso;
* comportamento;
* recorrência.

Quanto maior esse conjunto de dados e transações, maior deverá ser a capacidade da plataforma de:

* gerar receita;
* reduzir custo operacional;
* aumentar recorrência;
* criar distribuição;
* conectar empresas;
* conectar consumidores;
* criar novos produtos.

Esse é o mecanismo que transforma um produto SaaS isolado em um ecossistema.

