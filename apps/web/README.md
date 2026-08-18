# apps/web

Frontend Next.js 15 (App Router) da biblioteca de componentes — ver
`docs/MVP2.md`. Nesta etapa: a home pública (`/`, seção 5.1) e a
infraestrutura de preview sandboxed (seção 8) estão implementadas. A
página de detalhe (`/component/[slug]`) e a área administrativa ainda não
existem.

## Rodando localmente

```bash
pnpm install                      # na raiz do monorepo
cp .env.example .env              # se ainda não existir
pnpm --filter @uilib/web dev
```

O servidor sobe em `http://localhost:3000`. A home (`/`) precisa da API
(`apps/api`, seção 4) rodando e acessível em `INTERNAL_API_URL` — sem ela,
a home continua carregando (não quebra) e mostra o estado de erro
recuperável com um botão "Try again".

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
monorepo, seção "Clerk (MVP2)" / "Web (MVP2)" / "Revalidação de cache
(MVP2)":

| Variável | Onde é usada | Descrição |
|---|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | cliente + servidor | Chave pública do Clerk |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | cliente + servidor | Rota de login (`/sign-in`) |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | cliente + servidor | Rota pós-login (`/admin`) |
| `NEXT_PUBLIC_API_URL` | cliente + servidor | URL da API usada pelo navegador |
| `NEXT_PUBLIC_SITE_URL` | cliente + servidor | URL pública do site (usada em metadata/SEO) |
| `CLERK_SECRET_KEY` | **apenas servidor** | Nunca é embutida no bundle do cliente |
| `INTERNAL_API_URL` | **apenas servidor** | URL da API na rede interna do Docker |
| `REVALIDATE_SECRET` | **apenas servidor** | Segredo compartilhado com `apps/api` para `revalidateTag` |

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
pnpm --filter @uilib/web test        # Vitest
```

## Estrutura

```
src/
├── app/
│   ├── layout.tsx              # layout raiz — Tailwind + metadata base
│   ├── page.tsx                 # home pública (seção 5.1) — Server Component, dinâmica
│   ├── loading.tsx              # skeleton da home (Suspense fallback)
│   ├── error.tsx                # rede de segurança para falhas inesperadas
│   ├── globals.css              # @import "tailwindcss"
│   └── dev/preview/              # rota de dev, noindex + bloqueada em produção —
│                                  # valida SandboxPreview/LazyPreview isoladamente
├── components/
│   ├── ui/                       # reservado para o subset shadcn/ui (seção 3 do MVP2)
│   ├── preview/                  # SandboxPreview, LazyPreview, ThemeToggle (seção 8)
│   └── catalog/                  # ComponentCard, Grid, SearchBar, CategoryNav,
│                                  # SortToggle, Pagination, CatalogGrid, EmptyState (seção 5.1)
└── lib/
    ├── env.ts                    # validação de ambiente com Zod (seção 13)
    ├── api-client.ts             # camada única de comunicação com a API (seção 4/10)
    ├── build-srcdoc.ts           # monta o documento do iframe de preview (seção 8)
    └── catalog-url.ts            # parsing/construção de URL canônica da home (seção 5.1)
```

As demais pastas descritas na seção 7 do `docs/MVP2.md`
(`components/code`, `components/prompt`, `components/admin`,
`middleware.ts`, `/component/[slug]`, rotas de admin) ainda não existem —
serão adicionadas junto com as funcionalidades que as usam.
