## Why

Commerce OS não tem hoje nenhuma base de código. Antes de vender qualquer produto (Fase 1 — Sell), o PRD (seção 32) exige uma fundação multi-tenant com identidade, autorização e auditoria — sem ela, nenhuma outra capacidade (catálogo, capacidade, checkout, pagamentos) tem onde se apoiar com isolamento e rastreabilidade corretos. Esta mudança cria essa fundação: o monólito modular (backend Node/Express hexagonal + DDD), o frontend Next.js, e a infraestrutura Docker que os dois módulos seguintes (Sell, Enter) vão herdar.

## What Changes

- Cria o monorepo (pnpm workspaces + Turborepo) com `apps/web` (Next.js) e `apps/backend` (Express).
- Cria o backend como monólito modular com arquitetura hexagonal + DDD: cada bounded context (`organization`, `venue`, `identity`, `authorization`, `audit`, `configuration`) com camadas `domain/`, `application/`, `infrastructure/`.
- Implementa isolamento multi-tenant via Postgres shared schema + coluna `tenant_id` + Row Level Security (RLS) + filtro obrigatório na camada de repositório (defesa em profundidade).
- Implementa comunicação entre módulos: chamadas diretas (síncronas) entre use-cases para leitura/comando, e outbox pattern em Postgres para eventos de domínio (ex.: `organization.created`), com worker dedicado acordado via `LISTEN/NOTIFY`.
- Implementa autenticação de usuários administrativos via sessão com cookie httpOnly (IAM-001).
- Implementa RBAC com os papéis iniciais do PRD: Owner, Admin, Finance, Sales, Operator, Access Operator, Read Only (IAM-002), aplicado no backend (IAM-003).
- Implementa audit log para operações sensíveis (IAM-004, seção 18.5), consumindo eventos de domínio via outbox.
- Cria camada de dados com Kysely (query builder tipado) + `node-pg-migrate` para migrations.
- Dockeriza cada serviço de infraestrutura de forma independente: `backend`, `web`, `postgres`, `outbox-worker` (mesma imagem do backend, comando de start distinto), orquestrados via `docker-compose`.
- O Next.js consome o backend diretamente via Route Handlers, que atuam como BFF (sem processo BFF separado).

## Capabilities

### New Capabilities

- `foundation/organization`: criação de organizações, isolamento multi-tenant, configurações próprias por organização (ORG-001..004).
- `foundation/venue`: estabelecimentos físicos pertencentes a uma organização (múltiplos venues por organização).
- `foundation/identity`: autenticação de usuários administrativos via sessão com cookie httpOnly (IAM-001).
- `foundation/authorization`: RBAC com papéis Owner/Admin/Finance/Sales/Operator/Access Operator/Read Only, validação de permissões no backend (IAM-002, IAM-003).
- `foundation/audit`: trilha de auditoria para operações sensíveis, alimentada por eventos de domínio via outbox (IAM-004).
- `foundation/configuration`: configurações por organização/tenant, base para feature flags e políticas futuras.

### Modified Capabilities

(nenhuma — este é o primeiro change do projeto, não há specs existentes para modificar)

## Impact

- **Novo repositório**: estrutura de monorepo criada do zero (`apps/web`, `apps/backend`, `packages/*` compartilhados se necessário).
- **Infraestrutura**: Postgres, Docker/docker-compose, migrations via `node-pg-migrate`.
- **Dependências novas**: Express, Kysely, `node-pg-migrate`, Next.js, Turborepo, pnpm.
- **Sem código existente afetado** (greenfield) — este change estabelece as convenções (hexagonal + DDD, isolamento de tenant, outbox) que todos os changes futuros (Sell, Enter, Operate...) vão seguir.
