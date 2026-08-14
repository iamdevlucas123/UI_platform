# MVP1 — Fundação: Arquitetura, Banco de Dados e API Backend

**Etapa 1 de 3 do fluxo de criação** (MVP1 → MVP2 → Final)

---

## 1. Contexto do produto

O projeto é uma **biblioteca web pública de componentes de interface autorais**, no estilo Uiverse.io. O visitante navega por categorias, pesquisa, visualiza uma prévia funcional de cada componente e, na página de detalhes, pode **copiar o código** ou **copiar um prompt pronto para IA** que instrui um agente de programação (Claude Code, Cursor, Copilot etc.) a implementar aquele componente no projeto dele.

O diferencial do produto é a ponte entre o catálogo e o agente de IA do usuário: entregamos um prompt de texto autocontido e determinístico, sem qualquer chamada a LLM do nosso lado. Isso mantém o custo operacional próximo de zero.

### Personas

| Persona | Necessidade | Frequência |
|---|---|---|
| **Visitante/Desenvolvedor** | Encontrar um componente e usá-lo no próprio projeto em minutos | Alta, tráfego anônimo |
| **Administrador** (1 pessoa) | Cadastrar, editar e publicar componentes e categorias | Baixa, poucas escritas por dia |

Essa assimetria — leitura massiva anônima vs. escrita rara autenticada — orienta as decisões de cache e simplicidade em todo o projeto.

### Categorias iniciais

Animation, Text Animation, Buttons, Components, Checkboxes, Toggle Switches, Cards, Loaders, Inputs, Radio Buttons, Forms, Patterns, Tooltips, UI Kits. A arquitetura deve permitir adicionar novas categorias sem alterações estruturais.

### Regras gerais do projeto

- Priorizar simplicidade; evitar overengineering.
- TypeScript de ponta a ponta.
- Baixo custo operacional.
- Preparado para crescer, sem implementar complexidade prematuramente.

---

## 2. Objetivo desta etapa (MVP1)

Construir a fundação do projeto: monorepo, banco de dados, schema Prisma e a **API REST pública e administrativa completa**, testada e funcional via HTTP, **sem nenhuma interface web ainda**. Ao final desta etapa, todos os endpoints devem responder corretamente e podem ser validados via `curl`, Postman ou testes automatizados.

Autenticação de administrador (Clerk) e frontend ficam para o MVP2 — nesta etapa, os endpoints administrativos existem mas usam um middleware de auth simples e substituível (ver Seção 8).

---

## 3. Stack tecnológica do projeto (visão completa)

Esta é a stack de todo o projeto — usada integralmente aqui no backend, e referenciada nas próximas etapas.

### Backend (foco desta etapa)

| Item | Escolha | Motivo |
|---|---|---|
| Runtime | **Node.js 22 LTS** | Maturidade e compatibilidade com Prisma |
| Framework | **Express 5** | Requisito do projeto; trata async errors nativamente |
| ORM | **Prisma 6** | Migrations e tipagem excelentes |
| Validação | **Zod** | Infere tipos TS; compartilhável com o frontend via pacote `shared` |
| Logs | **Pino + pino-http** | JSON estruturado, baixo overhead, request-id correlacionado |
| Rate limit | **express-rate-limit** (memória) | Instância única no MVP; Redis seria infra desnecessária |
| Segurança HTTP | **helmet + cors** | Padrão de mercado |
| Banco | **PostgreSQL 16** | Requisito; extensão `pg_trgm` cobre a busca do MVP |

### Frontend e infraestrutura (referência — detalhados em MVP2 e Final)

Next.js 15 (App Router) + TypeScript + Tailwind CSS + shadcn/ui no frontend; Clerk para autenticação; Docker + AWS (EC2 + RDS) para infraestrutura; GitHub Actions para CI/CD.

### Gerenciador de pacotes

**pnpm 9 + workspaces**, monorepo simples, sem Turborepo/Nx (não se justifica para dois apps).

---

## 4. Estrutura do projeto (monorepo completo)

Esta estrutura é criada integralmente nesta etapa, mesmo que as pastas de `apps/web` só recebam conteúdo no MVP2.

```
ui-library/
├── apps/
│   ├── web/                          # Next.js — populado no MVP2
│   │   └── (placeholder nesta etapa)
│   │
│   └── api/                          # Express — foco desta etapa
│       ├── src/
│       │   ├── server.ts                       # bootstrap + graceful shutdown
│       │   ├── app.ts                          # montagem do Express
│       │   ├── config/env.ts                   # validação de env com Zod
│       │   ├── lib/
│       │   │   ├── prisma.ts
│       │   │   ├── logger.ts
│       │   │   ├── errors.ts                   # AppError, NotFound, Conflict...
│       │   │   ├── slug.ts
│       │   │   └── revalidate.ts               # placeholder; usado no MVP2
│       │   ├── middlewares/
│       │   │   ├── require-admin.ts
│       │   │   ├── validate.ts
│       │   │   ├── rate-limit.ts
│       │   │   ├── request-id.ts
│       │   │   └── error-handler.ts
│       │   ├── modules/
│       │   │   ├── components/
│       │   │   │   ├── components.routes.ts
│       │   │   │   ├── components.controller.ts
│       │   │   │   ├── components.service.ts
│       │   │   │   ├── components.repository.ts
│       │   │   │   └── components.mapper.ts    # entidade → DTO público
│       │   │   ├── categories/ (mesma estrutura)
│       │   │   ├── prompts/
│       │   │   │   ├── prompt.service.ts
│       │   │   │   └── default-template.ts
│       │   │   └── health/health.routes.ts
│       │   └── routes.ts                       # agrega os routers
│       ├── prisma/
│       │   ├── schema.prisma
│       │   ├── migrations/
│       │   └── seed.ts                         # 14 categorias + componentes exemplo
│       ├── tests/
│       │   ├── unit/
│       │   └── integration/
│       └── Dockerfile
│
├── packages/
│   └── shared/                       # schemas Zod + tipos + constantes
│       ├── src/
│       │   ├── schemas/component.ts
│       │   ├── schemas/category.ts
│       │   ├── schemas/pagination.ts
│       │   ├── types.ts
│       │   └── index.ts
│       └── package.json
│
├── docker-compose.yml                # ambiente de desenvolvimento
├── .env.example
├── pnpm-workspace.yaml
├── package.json
└── README.md
```

**Por que monorepo:** o pacote `shared` é a razão. Ele guarda os schemas Zod que o backend usa para validar e que o frontend (na próxima etapa) usa para tipar. Com dois repositórios separados, sincronizar isso exigiria publicar um pacote npm privado — atrito desnecessário para um time pequeno.

---

## 5. Modelagem do banco de dados

### Entidades

```
┌───────────────┐         ┌──────────────────────────┐
│    User       │         │       Category           │
├───────────────┤         ├──────────────────────────┤
│ id (PK)       │         │ id (PK)                  │
│ clerkId (UQ)  │         │ name (UQ)                │
│ email (UQ)    │         │ slug (UQ)                │
│ name          │         │ description              │
│ role          │         │ position                 │
└───────┬───────┘         └────────────┬─────────────┘
        │ 1                            │ 1
        │ N                            │ N
        └──────────┐    ┌──────────────┘
                   ▼    ▼
            ┌──────────────────────┐
            │      Component       │
            ├──────────────────────┤
            │ id (PK)              │
            │ name                 │
            │ slug (UQ)            │
            │ description          │
            │ html / css / js      │
            │ technologies[]       │
            │ promptTemplate?      │
            │ status               │
            │ publishedAt?         │
            │ categoryId (FK)      │
            │ authorId (FK, opt)   │
            └──────────────────────┘
```

### Decisões de modelagem e justificativas

**1. `html`, `css` e `js` em colunas separadas, não um campo `code` genérico.**
Os componentes são HTML + CSS puro (+ JS opcional). O código exibido é literalmente o código renderizado no preview — não existem "fonte" e "preview" que possam divergir. A conversão para React/Vue/Svelte é responsabilidade do prompt de IA. Um campo único obrigaria parsing para montar o preview; três colunas eliminam esse problema.

**2. `technologies` como `String[]` nativo do Postgres, não uma tabela `Technology` com N:N.**
O MVP não filtra por tecnologia, só exibe tags. Uma tabela extra + join adicionaria complexidade para entregar uma lista de strings. Migração futura, se necessário, é uma query de normalização de meia hora.

**3. Sem `ComponentVersion`.**
Com um único autor, sem consumidores externos travados numa versão específica e sem necessidade de rollback de conteúdo, versionamento seria peso morto. O que protege contra erro humano é o backup automático do banco (configurado na etapa Final). Versionamento passa a valer a pena quando existir CLI/registry externo consumindo os componentes.

**4. `User` mínimo, sincronizado por upsert preguiçoso.**
A tabela existe para permitir a FK `Component.authorId` (autoria) e evitar chamadas de rede a um provedor de identidade externo só para exibir um nome. É preenchida na primeira escrita autenticada — sem webhook.

**5. `status` (DRAFT/PUBLISHED) + `publishedAt`.**
Custa uma coluna e um enum, e permite preparar componentes sem expô-los publicamente. Endpoints públicos sempre filtram `status = PUBLISHED`.

**6. `onDelete: Restrict` em `Category → Component`.**
Deletar uma categoria não pode apagar componentes silenciosamente; a API retorna 409 e instrui a mover ou remover componentes antes.

### Índices

| Índice | Tipo | Uso |
|---|---|---|
| `Component.slug` | unique btree | Página de detalhes |
| `Component(categoryId, status)` | btree composto | Listagem filtrada por categoria |
| `Component(status, createdAt DESC)` | btree composto | Listagem padrão ordenada |
| `Component.name` | GIN `gin_trgm_ops` | Busca por nome |
| `Component.description` | GIN `gin_trgm_ops` | Busca por descrição |
| `Category.slug` | unique btree | Página de categoria |
| `Category.position` | btree | Ordenação do menu |

**Estratégia de busca:** `ILIKE '%termo%'` sobre `name` e `description`, acelerado por índices GIN trigram (`pg_trgm`). Suficiente e instantâneo até milhares de registros — sem necessidade de `tsvector`, triggers ou serviço de busca externo neste estágio.

---

## 6. Schema Prisma

```prisma
// apps/api/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  ADMIN
}

enum ComponentStatus {
  DRAFT
  PUBLISHED
}

model User {
  id        String   @id @default(cuid())
  clerkId   String   @unique
  email     String   @unique
  name      String?
  role      Role     @default(ADMIN)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  components Component[]

  @@map("users")
}

model Category {
  id          String   @id @default(cuid())
  name        String   @unique
  slug        String   @unique
  description String?
  position    Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  components Component[]

  @@index([position])
  @@map("categories")
}

model Component {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique
  description String

  // Código-fonte: é simultaneamente o que se copia e o que se renderiza
  html String
  css  String
  js   String?

  technologies String[] @default([])

  /// Template específico deste componente. Nulo => usa o template global.
  promptTemplate String?

  status      ComponentStatus @default(DRAFT)
  publishedAt DateTime?

  categoryId String
  category   Category @relation(fields: [categoryId], references: [id], onDelete: Restrict)

  authorId String?
  author   User?   @relation(fields: [authorId], references: [id], onDelete: SetNull)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([categoryId, status])
  @@index([status, createdAt(sort: Desc)])
  @@map("components")
}
```

### Migration adicional para busca (trigram)

```sql
-- apps/api/prisma/migrations/xxxx_add_trigram_search/migration.sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX components_name_trgm_idx
  ON "components" USING GIN (name gin_trgm_ops);

CREATE INDEX components_description_trgm_idx
  ON "components" USING GIN (description gin_trgm_ops);
```

### Seed

`prisma/seed.ts` cria as 14 categorias iniciais, na ordem definida, e 2–3 componentes de exemplo por categoria — suficiente para desenvolver o frontend na próxima etapa sem cadastro manual. Usa `upsert` por slug para ser **idempotente**.

```ts
const CATEGORIES = [
  'Animation', 'Text Animation', 'Buttons', 'Components', 'Checkboxes',
  'Toggle Switches', 'Cards', 'Loaders', 'Inputs', 'Radio Buttons',
  'Forms', 'Patterns', 'Tooltips', 'UI Kits',
] as const;
```

---

## 7. Endpoints da API

Base: `/api`. Formato: JSON. Envelope de resposta padronizado:

```jsonc
// sucesso (lista)
{ "data": [...], "meta": { "page": 1, "limit": 24, "total": 137, "totalPages": 6 } }

// sucesso (item)
{ "data": { ... } }

// erro
{ "error": { "code": "VALIDATION_ERROR", "message": "Invalid payload",
             "details": [{ "path": "slug", "message": "Slug already in use" }] } }
```

### Resumo

| Método | Rota | Auth | Objetivo |
|---|---|---|---|
| GET | `/api/health` | — | Health check |
| GET | `/api/categories` | — | Listar categorias com contagem de componentes |
| GET | `/api/components` | — | Listar/pesquisar/filtrar componentes publicados |
| GET | `/api/components/:slug` | — | Detalhe de um componente publicado |
| GET | `/api/components/:slug/prompt` | — | Prompt renderizado para a stack escolhida |
| GET | `/api/admin/components` | Admin | Listar todos (inclui DRAFT) |
| GET | `/api/admin/components/:id` | Admin | Carregar componente para edição |
| POST | `/api/admin/components` | Admin | Criar componente |
| PUT | `/api/admin/components/:id` | Admin | Atualizar componente |
| DELETE | `/api/admin/components/:id` | Admin | Excluir componente |
| POST | `/api/admin/categories` | Admin | Criar categoria |
| PUT | `/api/admin/categories/:id` | Admin | Atualizar categoria |
| DELETE | `/api/admin/categories/:id` | Admin | Excluir categoria (bloqueada se em uso) |

### `GET /api/components`

**Query params:** `q` (string, 1–100), `category` (slug, 404 se não existir), `page` (int ≥1, default 1), `limit` (int 1–48, default 24), `sort` (`recent` | `name`, default `recent`).

Retorna **apenas** `status = PUBLISHED`. Response:

```jsonc
{
  "data": [
    {
      "id": "clx...",
      "name": "Neon Toggle Switch",
      "slug": "neon-toggle-switch",
      "description": "Um toggle com glow neon e transição suave.",
      "technologies": ["HTML", "CSS", "CSS Animation"],
      "category": { "name": "Toggle Switches", "slug": "toggle-switches" },
      "preview": { "html": "<label class=…>", "css": ".switch{…}", "js": null },
      "createdAt": "2026-08-01T12:00:00.000Z"
    }
  ],
  "meta": { "page": 1, "limit": 24, "total": 137, "totalPages": 6 }
}
```

O código do preview vai na própria listagem porque a UI (MVP2) renderiza previews ao vivo nos cards, evitando 24 round-trips. `limit=48` como teto controla o crescimento do payload. Erros: `400`, `404`.

### `GET /api/components/:slug`

Query opcional `preview=1` (permite ver DRAFT com token válido de admin). Response inclui `html`, `css`, `js`, `category`, e o campo `prompt` **já renderizado** com os defaults (`React` + `Tailwind CSS`). Erros: `404`.

### `GET /api/components/:slug/prompt`

Query params: `framework` (`react`|`vue`|`svelte`|`angular`|`html`, default `react`), `styling` (`tailwind`|`css`|`css-modules`|`styled-components`, default `tailwind`). Response: `{ "data": { "prompt": "…" } }`.

Usado quando o usuário troca a stack de destino na página de detalhes (MVP2). Mantido no servidor para ter uma única implementação do template. Erros: `400`, `404`.

### `GET /api/categories`

Response: lista com `id`, `name`, `slug`, `description`, `position`, `componentCount` (contando só publicados, via `_count` do Prisma com filtro).

### `POST /api/admin/components`

**Request:**

```jsonc
{
  "name": "Neon Toggle Switch",
  "slug": "neon-toggle-switch",
  "description": "Um toggle com glow neon e transição suave.",
  "categoryId": "clx…",
  "html": "<label class=\"switch\">…</label>",
  "css": ".switch { … }",
  "js": null,
  "technologies": ["HTML", "CSS"],
  "promptTemplate": null,
  "status": "DRAFT"
}
```

**Validação (Zod, em `packages/shared`):**

| Campo | Regra |
|---|---|
| `name` | string, 2–80, obrigatório |
| `slug` | `/^[a-z0-9]+(?:-[a-z0-9]+)*$/`, 2–80, único (409 se duplicado) |
| `description` | string, 10–500 |
| `categoryId` | cuid válido, categoria deve existir (422 se não) |
| `html` | string, 1–50.000 |
| `css` | string, 0–50.000 |
| `js` | string opcional, 0–20.000 |
| `technologies` | array de string 1–30, máx. 10 itens, deduplicado |
| `promptTemplate` | string opcional, máx. 20.000 |
| `status` | enum `DRAFT` \| `PUBLISHED` (default `DRAFT`) |

Regras de negócio no service: se `status = PUBLISHED` e `publishedAt` nulo → define `publishedAt = now()`; `authorId` vem do token, nunca do body; slug normalizado (lowercase, sem acentos) antes de checar unicidade. Response `201`. Erros: `400`, `401`, `403`, `409`, `422`.

### `PUT /api/admin/components/:id`

Mesmo corpo do `POST`, campos opcionais (`schema.partial()`). Transição `DRAFT → PUBLISHED` define `publishedAt` se ainda nulo; `PUBLISHED → DRAFT` mantém `publishedAt` (histórico da primeira publicação). Response `200`. Erros: `400`, `401`, `403`, `404`, `409`, `422`.

### `DELETE /api/admin/components/:id`

Exclusão física (hard delete) — não há soft delete, pois isso contaminaria todas as queries e o backup do banco (configurado na etapa Final) já cobre arrependimento. Response `204`. Erros: `401`, `403`, `404`.

### Endpoints de categoria

`POST /api/admin/categories` — `{ name (2–50, único), slug (opcional, derivado), description (opcional, ≤300), position (int, default 0) }` → `201`.

`PUT /api/admin/categories/:id` — campos parciais → `200`.

`DELETE /api/admin/categories/:id` → `204`; retorna **`409 CATEGORY_IN_USE`** com `details.componentCount` se houver componentes associados.

### `GET /api/health`

`200` com `{ "status": "ok", "uptime": 1234, "db": "ok" }`, executando `SELECT 1`. Usado por healthcheck do Docker e, na etapa Final, pelo pipeline de deploy.

---

## 8. Prompt de IA — geração por template

Cada componente tem um campo `promptTemplate` opcional; quando nulo, o sistema aplica o **template global padrão**. Isso evita reeditar todos os componentes sempre que o prompt for melhorado.

**Variáveis do template:** `{{name}}`, `{{category}}`, `{{description}}`, `{{technologies}}`, `{{html}}`, `{{css}}`, `{{js}}`, `{{targetFramework}}`, `{{targetStyling}}`, `{{sourceUrl}}`.

**Template global padrão:**

```text
You are working inside an existing codebase. Your task is to add ONE new UI
component, reproducing the reference implementation below as faithfully as
possible.

## Component
Name: {{name}}
Category: {{category}}
Description: {{description}}
Reference: {{sourceUrl}}

## Reference implementation (HTML + CSS{{#js}} + JS{{/js}})

```html
{{html}}
```

```css
{{css}}
```
{{#js}}
```js
{{js}}
```
{{/js}}

## Target stack
- Framework: {{targetFramework}}
- Styling: {{targetStyling}}

## Requirements
1. Port the reference implementation to {{targetFramework}} using
   {{targetStyling}}. Keep the exact visual result: identical dimensions,
   colors, spacing, typography, transitions, easing curves and timings.
2. If {{targetStyling}} cannot express something (complex keyframes, custom
   pseudo-elements, filters), keep that part as plain CSS in a co-located
   stylesheet or a <style> block instead of approximating it.
3. Create the component as a NEW self-contained file, following the naming and
   folder conventions already present in this codebase. Infer them from the
   existing code — do not invent a new structure.
4. Make the component reusable: extract text, colors and sizes that a consumer
   would reasonably want to change into props, with defaults matching the
   reference.
5. Scope all class names and styles so they cannot leak into or collide with
   existing styles.
6. Do NOT modify unrelated files, do NOT reformat existing code, do NOT add
   dependencies unless strictly required — and if one is required, state why
   before adding it.
7. Preserve accessibility: keep semantic elements, focus states, ARIA
   attributes and keyboard interaction from the reference; add them if missing.
8. After creating the file, show a minimal usage example.

Output the complete, ready-to-use code. Do not summarize or omit sections.
```

O botão "Copy AI Prompt" (implementado no MVP2) apenas copia o texto retornado por `GET /api/components/:slug` ou `/prompt` — nenhuma chamada a LLM acontece no produto.

---

## 9. Autenticação nesta etapa (placeholder)

A autenticação definitiva com Clerk é implementada no **MVP2**, junto com o frontend administrativo. Nesta etapa, para permitir testar e desenvolver os endpoints `/api/admin/*` de forma isolada, use um middleware simples e substituível:

```ts
// middlewares/require-admin.ts (versão provisória do MVP1)
export function requireAdmin(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token !== env.DEV_ADMIN_TOKEN) {
    return next(new UnauthorizedError());
  }
  req.auth = { userId: 'dev-admin', email: 'admin@dev.local' };
  next();
}
```

`DEV_ADMIN_TOKEN` é uma variável de ambiente de desenvolvimento (qualquer string). **Este middleware é substituído inteiramente pela verificação real do Clerk no MVP2** — a interface (`req.auth.userId`) permanece a mesma, então nenhum controller ou service precisa mudar.

---

## 10. Segurança do backend

| Vetor | Controle nesta etapa |
|---|---|
| Validação de entrada | Zod em 100% dos endpoints com body ou query; `express.json({ limit: '1mb' })` |
| SQL Injection | Prisma Client com queries parametrizadas; nunca concatenação de strings |
| CORS | `cors({ origin: env.WEB_ORIGIN, credentials: false })`; origem exata, sem wildcard |
| Rate limiting | `express-rate-limit`: 120 req/min/IP em rotas públicas, 30 req/min em `/api/admin/*` |
| Headers | `helmet()` |
| Secrets | Nunca no repositório; `.env` local (gitignored) a partir de `.env.example`; SSM em produção (etapa Final) |
| Env vars | Validadas com Zod no boot; a aplicação falha ao iniciar se faltar variável |
| Logs | Pino com redaction de `authorization`, `cookie`, `password` |
| Erros | `error-handler` genérico: mensagens de domínio para o cliente, stack trace só no log |

---

## 11. Docker (ambiente de desenvolvimento)

```yaml
# docker-compose.yml
services:
  db:
    image: postgres:16-alpine
    container_name: uilib_db
    restart: unless-stopped
    environment:
      POSTGRES_USER: uilib
      POSTGRES_PASSWORD: uilib
      POSTGRES_DB: uilib
    ports:
      - '5432:5432'
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U uilib -d uilib']
      interval: 5s
      timeout: 5s
      retries: 10

  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
      target: dev
    container_name: uilib_api
    restart: unless-stopped
    env_file: .env
    environment:
      DATABASE_URL: postgresql://uilib:uilib@db:5432/uilib?schema=public
      PORT: '4000'
      WEB_ORIGIN: http://localhost:3000
    ports:
      - '4000:4000'
    volumes:
      - ./apps/api:/app/apps/api
      - ./packages:/app/packages
      - /app/node_modules
      - /app/apps/api/node_modules
    depends_on:
      db:
        condition: service_healthy
    command: sh -c "pnpm prisma migrate deploy && pnpm prisma db seed && pnpm dev"

volumes:
  pgdata:
```

O serviço `web` é adicionado a este arquivo no MVP2. O `healthcheck` do Postgres + `condition: service_healthy` evita o erro clássico de conexão na primeira subida; migrations e seed rodam automaticamente no start.

```dockerfile
# apps/api/Dockerfile
FROM node:22-alpine AS base
RUN corepack enable && apk add --no-cache libc6-compat openssl
WORKDIR /app

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile

FROM deps AS dev
COPY . .
RUN pnpm --filter @uilib/api prisma generate
EXPOSE 4000
CMD ["pnpm", "--filter", "@uilib/api", "dev"]
```

(O stage `build`/`prod` deste Dockerfile é detalhado na etapa Final, quando entra em produção.)

---

## 12. Variáveis de ambiente desta etapa

```bash
# ───── Banco de dados ─────
DATABASE_URL="postgresql://uilib:uilib@db:5432/uilib?schema=public"

# ───── API ─────
NODE_ENV="development"
PORT="4000"
WEB_ORIGIN="http://localhost:3000"
LOG_LEVEL="debug"

# ───── Auth provisória (substituída pelo Clerk no MVP2) ─────
DEV_ADMIN_TOKEN="qualquer-string-para-dev"
```

Validação no boot:

```ts
// config/env.ts
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  DATABASE_URL: z.string().url(),
  WEB_ORIGIN: z.string().url(),
  PORT: z.coerce.number().default(4000),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export const env = envSchema.parse(process.env);
```

---

## 13. Estratégia de testes desta etapa

| Camada | Ferramenta | Cobre |
|---|---|---|
| Unitário | Vitest | `slugify` com acentos/caracteres especiais; `renderPrompt` substituindo variáveis e omitindo bloco JS quando nulo; transição de `status` definindo `publishedAt` |
| Integração | Vitest + Supertest + Postgres em Docker | Todas as rotas listadas na Seção 7: `GET /components` filtrando DRAFT, paginação, busca por `q`, 409 em slug duplicado, 409 ao apagar categoria em uso, 401/403 nas rotas admin |

Banco de testes: segundo serviço Postgres (porta 5433) com `DATABASE_URL` própria; `prisma migrate deploy` antes da suíte; `TRUNCATE ... RESTART IDENTITY CASCADE` entre testes.

**Meta:** toda rota da API com pelo menos um teste de caminho feliz e um de erro. Não perseguir cobertura percentual.

---

## 14. Entregável desta etapa (Definition of Done)

- [ ] `docker compose up` sobe banco + API com um único comando.
- [ ] Todos os 13 endpoints da Seção 7 implementados e respondendo conforme especificado.
- [ ] Seed populando 14 categorias e componentes de exemplo.
- [ ] Geração de prompt funcionando via `GET /api/components/:slug/prompt`.
- [ ] Suíte de testes de integração cobrindo os cenários da Seção 13, passando no CI.
- [ ] `pnpm lint` e `pnpm typecheck` sem erros.
- [ ] Nenhuma dependência de frontend ou de Clerk ainda — isso é responsabilidade do **MVP2**.
