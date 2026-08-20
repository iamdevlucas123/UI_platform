# apps/web

Frontend Next.js 15 (App Router) da biblioteca de componentes — ver
`docs/MVP2.md` (não versionado; ver README raiz para o resumo do produto).
Implementado nesta etapa: catálogo público (home, busca, categoria,
detalhe com preview sandboxed e cópia de código/prompt), área
administrativa (`/admin`, CRUD de componentes e categorias) protegida por
Clerk, revalidação de cache sob demanda e CSP restritiva.

## Rodando localmente

```bash
pnpm install                      # na raiz do monorepo
cp .env.example .env              # na raiz — se ainda não existir
pnpm --filter @uilib/web dev
```

O servidor sobe em `http://localhost:3000`. As páginas públicas precisam
da API (`apps/api`) rodando e acessível em `INTERNAL_API_URL` — sem ela,
elas continuam carregando (não quebram) e mostram um estado de erro
recuperável com um botão "Try again". A área `/admin` precisa, além
disso, de chaves reais do Clerk (ver README raiz, seção "Configurando o
Clerk") para autenticar de verdade.

**`pnpm --filter @uilib/web start` não funciona** com `output: 'standalone'`
(o próprio Next.js avisa isso e serve conteúdo incorreto/desatualizado em
vez de falhar). Para rodar o build de produção localmente sem Docker:

```bash
pnpm --filter @uilib/web build
cp -r apps/web/.next/static apps/web/.next/standalone/apps/web/.next/static
node apps/web/.next/standalone/apps/web/server.js
```

Em Docker (etapa Final), o Dockerfile faz essa cópia como parte do build da
imagem — isso só é necessário para testar o standalone manualmente.

## Variáveis de ambiente

Validadas em `src/lib/env.ts` (Zod). Ver `.env.example` na raiz do
monorepo:

| Variável | Onde é usada | Descrição |
|---|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | cliente + servidor | Chave pública do Clerk |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | cliente + servidor | Rota de login (`/sign-in`) |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | cliente + servidor | Rota pós-login (`/admin`) |
| `NEXT_PUBLIC_API_URL` | cliente + servidor | URL da API usada pelo navegador |
| `NEXT_PUBLIC_SITE_URL` | cliente + servidor | URL pública do site (usada em metadata/SEO) |
| `CLERK_SECRET_KEY` | **apenas servidor** | Nunca é embutida no bundle do cliente |
| `INTERNAL_API_URL` | **apenas servidor** | URL da API na rede interna do Docker |
| `REVALIDATE_SECRET` | **apenas servidor** | Segredo compartilhado com `apps/api` para `POST /api/revalidate` |

`CLERK_SECRET_KEY` e `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` exigem uma
aplicação real criada no dashboard do Clerk — os valores de exemplo em
`.env` apenas satisfazem o formato validado por `env.ts` (prefixo
`pk_`/`sk_`), sem autenticar de verdade.

## Scripts

```bash
pnpm --filter @uilib/web dev         # servidor de desenvolvimento
pnpm --filter @uilib/web build       # build de produção (output: 'standalone')
pnpm --filter @uilib/web lint        # ESLint
pnpm --filter @uilib/web typecheck   # tsc --noEmit
pnpm --filter @uilib/web test        # Vitest + Testing Library
```

Testes end-to-end (Playwright) vivem em `apps/e2e`, num workspace à parte
— ver `apps/e2e/README.md`.

## Estrutura

```
src/
├── middleware.ts                 # clerkMiddleware (auth) + CSP por request (seção 9/11)
├── app/
│   ├── layout.tsx                 # layout raiz — Tailwind + metadata base
│   ├── page.tsx                   # home pública (seção 5.1) — Server Component, dinâmica
│   ├── category/[slug]/           # catálogo filtrado por categoria (ISR)
│   ├── component/[slug]/          # detalhe: preview, abas de código, copy code/prompt, OG image
│   ├── sign-in/[[...sign-in]]/    # login Clerk
│   ├── admin/                     # área administrativa — ver abaixo
│   │   ├── layout.tsx              # guard de autorização (role === 'admin')
│   │   ├── page.tsx                # dashboard (contagem por status/categoria)
│   │   ├── components/             # listagem, criação e edição de componentes
│   │   └── categories/             # CRUD de categorias (num único page, com diálogos)
│   ├── api/revalidate/route.ts    # endpoint interno chamado pela API após mutações (seção 7)
│   ├── sitemap.ts / robots.ts     # SEO técnico
│   └── dev/preview/                # rota de dev, bloqueada em produção — playground de preview
├── components/
│   ├── ui/                        # subset shadcn/ui (Button, Input, Select, Dialog, Toast…)
│   ├── preview/                   # SandboxPreview, LazyPreview, ThemeToggle (seção 8)
│   ├── code/                      # CodeTabs, CodeBlockView (Shiki), CopyCodeButton
│   ├── prompt/                    # PromptPanel, CopyPromptButton, StackSelector
│   ├── catalog/                   # ComponentCard, Grid, SearchBar, CategoryNav, Pagination…
│   └── admin/                     # ComponentForm, CategoryForm, DataTable, hooks de TanStack Query
└── lib/
    ├── env.ts                     # validação de ambiente com Zod (seção 13)
    ├── api-client.ts              # camada única de comunicação com a API (seção 4/10)
    ├── csp.ts                     # Content-Security-Policy do site (seção 11)
    ├── build-srcdoc.ts            # monta o documento do iframe de preview (seção 8)
    ├── copy-to-clipboard.ts       # Copy Code / Copy AI Prompt (seção 5.2/5.3)
    └── catalog-url.ts             # parsing/construção de URL canônica do catálogo
```
