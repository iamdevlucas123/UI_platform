# UI Library — monorepo

Biblioteca web pública de componentes de interface. Este repositório está na
**etapa MVP1** (ver `docs/MVP1.md`): apenas a fundação do monorepo foi
implementada até aqui — workspaces pnpm, TypeScript, lint e testes. Rotas,
banco de dados, Docker e autenticação ainda **não** existem.

## Estrutura

```
apps/
  api/       # Express — API backend (esqueleto nesta etapa)
  web/       # Next.js — placeholder, populado no MVP2
packages/
  shared/    # schemas Zod e tipos compartilhados (esqueleto nesta etapa)
```

## Pré-requisitos

- Node.js 22 LTS ou superior
- pnpm 9 (`corepack enable` habilita a versão travada em `packageManager`)

## Instalação

```bash
pnpm install
```

## Configuração do ambiente

Copie o arquivo de exemplo e ajuste os valores conforme seu ambiente local:

```bash
cp .env.example apps/api/.env
```

Variáveis usadas nesta etapa (ver `.env.example`):

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | String de conexão do PostgreSQL |
| `NODE_ENV` | `development` \| `test` \| `production` |
| `PORT` | Porta HTTP da API |
| `WEB_ORIGIN` | Origem permitida no CORS |
| `LOG_LEVEL` | Nível de log do Pino |
| `DEV_ADMIN_TOKEN` | Token provisório para autenticar rotas `/api/admin/*` (substituído pelo Clerk no MVP2) |

## Executando a API

```bash
pnpm dev
```

Nesta etapa o `src/index.ts` é apenas um placeholder — ainda não há servidor
HTTP, rotas ou conexão com banco de dados.

## Testes

```bash
pnpm test
```

Roda a suíte Vitest de todos os workspaces (`apps/api` e `packages/shared`).

## Outros comandos úteis

```bash
pnpm lint        # ESLint em todos os workspaces
pnpm typecheck   # tsc --noEmit em todos os workspaces
pnpm build       # build de produção (tsc) em todos os workspaces
```

## Prisma

O schema do banco ainda não foi modelado nesta etapa; `apps/api/prisma/schema.prisma`
contém apenas o `generator`/`datasource` necessários para os scripts abaixo
funcionarem:

```bash
pnpm --filter @uilib/api prisma:generate   # gera o Prisma Client
pnpm --filter @uilib/api prisma:migrate    # cria/aplica migrations (requer DATABASE_URL válido)
pnpm --filter @uilib/api prisma:studio     # abre o Prisma Studio
```
