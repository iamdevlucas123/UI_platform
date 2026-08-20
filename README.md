# UI Library — monorepo

Biblioteca web pública de componentes de interface, no estilo Uiverse.io: um
visitante navega por categorias, pesquisa, vê uma prévia funcional de cada
componente e copia o código ou um prompt pronto para um agente de IA
implementá-lo no próprio projeto. Um administrador único cadastra e publica
componentes e categorias numa área `/admin` protegida por login real
(Clerk).

Este repositório está na **etapa MVP2** (ver `docs/MVP2.md`, se presente
localmente — a pasta `docs/` não é versionada): o site público completo, a
área administrativa (CRUD de componentes e categorias) e a autenticação
Clerk estão implementados e testados de ponta a ponta, incluindo Docker. A
etapa **Final** (deploy, AWS, CI/CD de produção) ainda não foi iniciada.

## Estrutura

```
apps/
  api/       # Express — API REST (contratos, validação Zod, Prisma/Postgres)
  web/       # Next.js 15 (App Router) — site público + área administrativa
  e2e/       # Playwright — testes end-to-end contra o stack real
packages/
  shared/    # schemas Zod e tipos compartilhados entre api e web
```

## Pré-requisitos

- Node.js 22 LTS ou superior
- pnpm 9 (`corepack enable` habilita a versão travada em `packageManager`)
- Docker + Docker Compose (caminho recomendado — sobe banco, API e web com
  um único comando)

## Como rodar (com Docker — recomendado)

```bash
cp .env.example .env      # ajuste os valores do Clerk (ver seção abaixo)
docker compose up -d
```

Isso sobe três serviços — `db` (Postgres), `api` (Express, com migrations e
seed automáticos) e `web` (Next.js) — e fica pronto (health check da API
respondendo, home carregando dados reais) em ~15s numa máquina comum.

- Site público: http://localhost:3000
- API: http://localhost:4000 (`GET /api/health`, `GET /api/categories`, …)
- Login administrativo: http://localhost:3000/sign-in

Para derrubar: `docker compose down` (o volume `pgdata` preserva os dados
entre reinícios; `docker compose down -v` também apaga o banco).

**Problema comum**: se um `next build` local (fora do Docker) falhar com
`EACCES` em `apps/web/.next/`, é porque o container `web` grava ali como
`root` (bind mount). Resolva com:
```bash
docker exec -u root uilib_web chown -R "$(id -u):$(id -g)" /app/apps/web/.next
```

## Configuração do ambiente

Copie `.env.example` para `.env` na raiz do monorepo — é a única cópia
necessária; `docker compose` (via `env_file: .env`) e os scripts `dev` de
cada workspace (via `--env-file-if-exists=.env`/carregamento automático do
Next.js) leem esse mesmo arquivo.

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | String de conexão do PostgreSQL |
| `NODE_ENV` | `development` \| `test` \| `production` |
| `PORT` | Porta HTTP da API |
| `WEB_ORIGIN` | Única origem aceita pelo CORS da API (seção 11) |
| `LOG_LEVEL` | Nível de log do Pino |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Chave pública do Clerk |
| `CLERK_SECRET_KEY` | Secret key do Clerk — a API a usa para validar o Bearer token de `/api/admin/*`; nunca vai ao bundle do cliente |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Rota de login (`/sign-in`) |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | Rota pós-login (`/admin`) |
| `NEXT_PUBLIC_API_URL` | URL da API usada pelo **navegador** (ex.: `http://localhost:4000`) |
| `INTERNAL_API_URL` | URL da API usada pelo **servidor** do Next — rede interna do Docker (`http://api:4000`) |
| `NEXT_PUBLIC_SITE_URL` | URL pública do site (metadata/SEO) |
| `REVALIDATE_SECRET` | Segredo compartilhado entre `api` e `web` para `POST /api/revalidate` (nunca embutido no cliente) |

### Configurando o Clerk (necessário para login administrativo)

1. Crie uma aplicação em https://dashboard.clerk.com (instância de
   desenvolvimento — grátis, sem cartão).
2. Copie a **Publishable key** e a **Secret key** para
   `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`/`CLERK_SECRET_KEY` em `.env`.
3. No dashboard, crie um usuário (ou convide o seu próprio email) e edite
   seu **Public metadata** para incluir `{ "role": "admin" }` — é esse
   campo, exposto no token de sessão, que autoriza `/admin` (autenticação
   ≠ autorização: qualquer usuário loga, só quem tem essa role acessa).
4. `docker compose restart web api` (ou reinicie os processos locais) para
   carregar as novas chaves.

Sem isso, o site público funciona normalmente — só o login em `/sign-in`
não autentica de verdade (os valores de exemplo em `.env.example` só
satisfazem o formato validado por `env.ts`, sem autenticar ninguém).

## Rodando sem Docker

```bash
pnpm install
pnpm --filter @uilib/shared build          # @uilib/api e @uilib/web consomem o dist/ compilado

# num terminal:
docker compose up -d db                     # só o Postgres, se preferir não containerizar api/web
pnpm --filter @uilib/api prisma:deploy
pnpm --filter @uilib/api prisma:seed
pnpm --filter @uilib/api dev                # http://localhost:4000

# noutro terminal:
pnpm --filter @uilib/web dev                # http://localhost:3000
```

## Testes

Pirâmide de testes desta etapa: componente/integração com Vitest +
Testing Library (web) e Vitest + Supertest (api), e ponta a ponta com
Playwright contra o stack real.

```bash
pnpm test                # Vitest em shared + api + web (unitários/integração)
pnpm lint                # ESLint em todos os workspaces
pnpm typecheck            # tsc --noEmit em todos os workspaces
pnpm build                # build de produção em todos os workspaces
```

Os testes de integração da API (`apps/api/tests/integration`) precisam de
um Postgres dedicado, isolado do de desenvolvimento:

```bash
docker compose -f docker-compose.test.yml up -d   # sobe db_test na porta 5433
pnpm --filter @uilib/api test                      # `pretest` já roda as migrations nele
```

### E2E (Playwright)

Cobre os 5 cenários obrigatórios desta etapa: home carrega e mostra cards;
busca filtra resultados; detalhe renderiza o preview sandboxed e copia o
código; copiar o prompt de IA; e login administrativo → criar componente →
aparecer no catálogo público após a revalidação. Roda contra uma instância
real do stack — não usa mocks de rede.

```bash
docker compose up -d                       # stack completo já precisa estar no ar
pnpm --filter @uilib/e2e exec playwright install --with-deps chromium   # uma vez
pnpm test:e2e
```

O cenário de login administrativo (criar componente → aparece publicado)
só roda com um usuário real de teste do Clerk — é **pulado** (não
mascarado como "passou") sem essas variáveis, exportadas no shell antes de
rodar, nunca commitadas:

```bash
export E2E_ADMIN_EMAIL="seu-usuario-admin@teste.com"
export E2E_ADMIN_PASSWORD="a senha desse usuário"
pnpm test:e2e
```

Ver `apps/e2e/README.md` para detalhes (seleção de browsers, relatórios,
`E2E_BASE_URL` para apontar a outro ambiente).

## Segurança

- CSP restritiva (`default-src 'self'`, sem domínios de terceiros além do
  necessário para o Clerk) aplicada em `apps/web/src/middleware.ts` — ver
  `apps/web/src/lib/csp.ts` para o raciocínio de cada diretiva.
- CORS da API aceita exclusivamente `WEB_ORIGIN` (`apps/api/src/app.ts`).
- Preview de componentes roda em `<iframe sandbox="allow-scripts">` sem
  `allow-same-origin`, com sua própria CSP — nunca `dangerouslySetInnerHTML`.
- Autenticação e autorização via Clerk (`middleware.ts` + `app/admin/layout.tsx`).

## Prisma (dentro de `apps/api`)

```bash
pnpm --filter @uilib/api prisma:generate   # gera o Prisma Client
pnpm --filter @uilib/api prisma:migrate    # cria/aplica migrations (dev)
pnpm --filter @uilib/api prisma:deploy     # aplica migrations pendentes (CI/produção)
pnpm --filter @uilib/api prisma:seed       # popula categorias + componentes de exemplo
pnpm --filter @uilib/api prisma:studio     # abre o Prisma Studio
```
