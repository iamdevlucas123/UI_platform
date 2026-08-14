# MVP2 — Frontend Público, Área Administrativa e Autenticação

**Etapa 2 de 3 do fluxo de criação** (MVP1 → MVP2 → Final)

---

## 1. Contexto do produto

O projeto é uma **biblioteca web pública de componentes de interface autorais**, no estilo Uiverse.io. O visitante navega por categorias, pesquisa, visualiza uma prévia funcional de cada componente e, na página de detalhes, pode **copiar o código** ou **copiar um prompt pronto para IA** que instrui um agente de programação a implementar aquele componente no projeto dele. Não há integração direta com nenhum provedor de LLM — o prompt é só texto copiado para a área de transferência.

### Personas

| Persona | Necessidade | Frequência |
|---|---|---|
| **Visitante/Desenvolvedor** | Encontrar um componente e usá-lo no próprio projeto em minutos | Alta, tráfego anônimo |
| **Administrador** (1 pessoa) | Cadastrar, editar e publicar componentes e categorias | Baixa, poucas escritas por dia |

### Categorias iniciais

Animation, Text Animation, Buttons, Components, Checkboxes, Toggle Switches, Cards, Loaders, Inputs, Radio Buttons, Forms, Patterns, Tooltips, UI Kits.

---

## 2. Objetivo desta etapa (MVP2)

Construir o site público completo (home, busca, categorias, página de detalhes com preview funcional) e a área administrativa (CRUD de componentes e categorias), com autenticação real do administrador via Clerk. Ao final desta etapa, o produto é utilizável de ponta a ponta em ambiente local: um visitante navega e copia prompts; um administrador loga e publica conteúdo.

Esta etapa **pressupõe uma API REST já funcionando** com os contratos descritos abaixo (endpoints, formatos de request/response, regras de validação). Se a API ainda não existir no ambiente onde este documento está sendo usado, ela deve ser implementada seguindo exatamente os contratos desta seção antes de prosseguir com o frontend.

---

## 3. Stack tecnológica desta etapa

| Item | Escolha | Alternativa considerada | Motivo da escolha |
|---|---|---|---|
| Framework | **Next.js 15 (App Router)** | Vite + React Router | SEO e cache (ISR) são essenciais para um catálogo público; Vite exigiria SSR manual |
| Linguagem | **TypeScript (strict)** | — | Consistência com o backend |
| Estilo | **Tailwind CSS v4** | CSS Modules | Velocidade de iteração; o CSS dos componentes do catálogo é isolado em iframe, então não há conflito |
| Componentes de UI | **shadcn/ui (subset)** | MUI, Chakra | Código copiado para o repo, sem dependência pesada; usar só: button, input, dialog, tabs, select, toast |
| Syntax highlight | **Shiki** | Prism, highlight.js | Highlight no servidor → zero JS extra no cliente, HTML já colorido |
| Ícones | **lucide-react** | — | Leve, tree-shakeable |
| Estado de servidor (admin) | **TanStack Query** | SWR, fetch manual | Cache, invalidação e estados de mutação prontos, só na área `/admin` |
| Formulários (admin) | **React Hook Form + Zod resolver** | Formik | Reaproveita os mesmos schemas Zod do backend |
| Autenticação | **Clerk** (`@clerk/nextjs`, `@clerk/backend`) | Auth.js, JWT próprio | Um único administrador não justifica construir signup, hash de senha, reset e MFA do zero |

---

## 4. Contrato da API consumida

Base: `/api`. Envelope padrão:

```jsonc
// sucesso (lista)
{ "data": [...], "meta": { "page": 1, "limit": 24, "total": 137, "totalPages": 6 } }
// sucesso (item)
{ "data": { ... } }
// erro
{ "error": { "code": "VALIDATION_ERROR", "message": "Invalid payload",
             "details": [{ "path": "slug", "message": "Slug already in use" }] } }
```

| Método | Rota | Auth | Uso no frontend |
|---|---|---|---|
| GET | `/api/health` | — | Smoke test |
| GET | `/api/categories` | — | Nav de categorias, filtros |
| GET | `/api/components?q=&category=&page=&limit=&sort=` | — | Home, busca, listagem por categoria |
| GET | `/api/components/:slug` | — | Página de detalhes (inclui `prompt` já renderizado) |
| GET | `/api/components/:slug/prompt?framework=&styling=` | — | Re-renderizar prompt ao trocar stack de destino |
| GET | `/api/admin/components` | Bearer (Clerk) | Listagem admin (inclui DRAFT) |
| GET | `/api/admin/components/:id` | Bearer (Clerk) | Carregar formulário de edição |
| POST | `/api/admin/components` | Bearer (Clerk) | Criar componente |
| PUT | `/api/admin/components/:id` | Bearer (Clerk) | Atualizar componente |
| DELETE | `/api/admin/components/:id` | Bearer (Clerk) | Excluir componente |
| POST/PUT/DELETE | `/api/admin/categories[/:id]` | Bearer (Clerk) | CRUD de categorias |

**Campos do componente** relevantes para a UI: `id`, `name`, `slug`, `description`, `html`, `css`, `js`, `technologies[]`, `category { name, slug }`, `prompt`, `status`, `createdAt`. Erros relevantes para tratar na UI: `404` (não encontrado), `409` (slug duplicado / categoria em uso), `422` (categoria inexistente), `401`/`403` (sessão inválida ou sem permissão).

---

## 5. Funcionalidades

### 5.1 Home / Biblioteca (pública)

- Grid responsivo de cards, cada card com **preview visual ao vivo** (não screenshot estático).
- Barra de busca (nome + descrição), debounce de 300ms, estado refletido na URL (`?q=`).
- Filtro por categoria (`/category/[slug]` ou `?category=`).
- Ordenação: mais recentes (padrão) e alfabética.
- Paginação (`?page=`), 24 itens por página.
- Estados de vazio, carregamento (skeleton) e erro.

### 5.2 Página de detalhes do componente (pública)

Rota: `/component/[slug]`.

- Nome, categoria (link) e descrição.
- **Preview funcional** em área ampla, com alternância de fundo claro/escuro.
- **Código** com syntax highlight, em abas `HTML` / `CSS` / `JS` (aba JS só aparece se houver conteúdo).
- Tags de tecnologias utilizadas.
- Botão **Copy Code** (copia HTML + CSS + JS concatenados).
- Botão **Copy AI Prompt**.
- Seletor opcional de stack de destino (framework + estilização) que re-busca o prompt via `GET /api/components/:slug/prompt`.
- Metadados de SEO: `<title>`, description, Open Graph (gerado dinamicamente via `ImageResponse`, sem upload de imagem), JSON-LD.

### 5.3 Cópia de prompt e de código (comportamento, sem chamada a LLM)

O clique em **Copy AI Prompt** apenas chama `navigator.clipboard.writeText()` com o texto já retornado pela API (campo `prompt` do `GET /:slug`, ou o resultado de `GET /:slug/prompt` quando a stack é trocada) e exibe um toast de confirmação. Nenhuma requisição a um provedor de IA acontece no produto.

### 5.4 Área administrativa

Rota: `/admin/*`, protegida por Clerk.

- Login via Clerk (`/sign-in`).
- Dashboard simples: contagem de componentes por status e por categoria.
- **Componentes:** listagem com busca e filtro por status; formulário de criação/edição com `name`, `slug` (auto-gerado, editável), `description`, `category`, `technologies`, `html`, `css`, `js`, `promptTemplate` (opcional) e `status`; exclusão com confirmação.
- **Preview ao vivo dentro do formulário**, atualizado com debounce enquanto o admin digita HTML/CSS/JS — evita o ciclo "salvar → abrir outra aba → conferir → voltar".
- **Categorias:** CRUD com `name`, `slug`, `description`, `position`. Exclusão bloqueada (409) se houver componentes associados; a UI deve exibir a mensagem de erro retornada pela API.

Não há workflow de aprovação, versionamento, histórico ou editor visual.

---

## 6. Fluxos principais do usuário

### Fluxo 1 — Descoberta e uso de um componente (visitante)

```
1. Usuário acessa a home → HTML já renderizado (cache)
2. Vê o grid com previews ao vivo (montados sob demanda, ver Seção 8)
3. Digita "toggle neon" na busca → debounce 300ms → atualiza URL → refetch
4. Clica em um card → navega para /component/[slug]
5. Analisa o preview em tamanho maior, alterna fundo claro/escuro
6. Escolhe a stack de destino (ex.: React + Tailwind)
7. Clica em "Copy AI Prompt" → clipboard → toast de confirmação
8. Cola no agente de IA dentro do próprio projeto
```

### Fluxo 2 — Cópia direta do código

```
1..5 (idêntico ao Fluxo 1)
6. Clica na aba CSS, revisa o código
7. Clica em "Copy Code" → HTML + CSS + JS no clipboard
```

### Fluxo 3 — Publicação de um componente (admin)

```
1. Admin acessa /admin → middleware do Clerk verifica sessão
   → sem sessão: redireciona para /sign-in
   → com sessão sem role=admin: 403 / not found
2. Clica em "Novo componente"
3. Preenche nome (slug auto-gerado), descrição, categoria, tecnologias
4. Cola HTML e CSS → preview ao vivo renderiza ao lado
5. Salva como DRAFT → POST /api/admin/components com Bearer token
6. Revisa a página do componente com ?preview=1
7. Altera status para PUBLISHED → PUT /api/admin/components/:id
8. Componente aparece publicamente (após revalidação de cache)
```

### Fluxo 4 — Erro e recuperação

```
- API fora do ar → páginas públicas continuam servindo do cache;
  banner discreto só aparece se um fetch client-side falhar
- Slug duplicado no admin → 409 exibido no campo, sem perder o formulário
- Categoria com componentes → DELETE retorna 409, UI explica o bloqueio
```

---

## 7. Estrutura do frontend

```
apps/web/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                    # home + busca
│   │   ├── opengraph-image.tsx
│   │   ├── category/[slug]/page.tsx
│   │   ├── component/[slug]/
│   │   │   ├── page.tsx
│   │   │   └── opengraph-image.tsx
│   │   ├── sign-in/[[...sign-in]]/page.tsx
│   │   ├── admin/
│   │   │   ├── layout.tsx              # guard de role
│   │   │   ├── page.tsx                # dashboard
│   │   │   ├── components/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── new/page.tsx
│   │   │   │   └── [id]/edit/page.tsx
│   │   │   └── categories/page.tsx
│   │   ├── api/revalidate/route.ts     # revalidação sob demanda
│   │   ├── sitemap.ts
│   │   └── robots.ts
│   ├── components/
│   │   ├── ui/                         # shadcn
│   │   ├── catalog/                    # ComponentCard, Grid, SearchBar, CategoryNav
│   │   ├── preview/                    # SandboxPreview, LazyPreview, ThemeToggle
│   │   ├── code/                       # CodeTabs, CopyCodeButton
│   │   ├── prompt/                     # CopyPromptButton, StackSelector
│   │   └── admin/                      # ComponentForm, CategoryForm, DataTable
│   ├── lib/
│   │   ├── api-client.ts               # wrapper de fetch tipado
│   │   ├── build-srcdoc.ts             # monta o documento do iframe de preview
│   │   ├── copy-to-clipboard.ts
│   │   └── env.ts                      # validação de env com Zod
│   └── middleware.ts                   # clerkMiddleware
├── Dockerfile
└── next.config.ts
```

### Estratégia de renderização por rota

| Rota | Renderização | Justificativa |
|---|---|---|
| `/` | ISR (`revalidate: 300`) | Conteúdo muda raramente; cache absorve todo o tráfego |
| `/category/[slug]` | ISR + `generateStaticParams` | Poucas categorias, todas pré-renderizadas |
| `/component/[slug]` | ISR + `generateStaticParams` | Páginas de maior valor de SEO |
| `/?q=...` (busca) | Dinâmica (Server Component com `searchParams`) | Combinações infinitas; não vale cachear |
| `/admin/*` | Dinâmica, client-heavy, `noindex` | Dados sempre frescos, sessão obrigatória |

Após qualquer mutação no admin (criar/editar/excluir), a API deve notificar um endpoint interno do Next (`/api/revalidate`, protegido por um secret compartilhado) que executa `revalidateTag('components')`. Isso mantém o cache agressivo nas páginas públicas **e** publicação quase instantânea.

---

## 8. Renderização do preview (decisão técnica central desta etapa)

Cada preview vive em um `<iframe sandbox="allow-scripts" srcdoc="...">`, **sem** `allow-same-origin`. Consequências:

- O conteúdo do iframe cai em uma origem opaca: não acessa `document.cookie`, `localStorage` nem o DOM da página pai. Contém eventual JS malicioso.
- O CSS do componente não vaza para o site e vice-versa. O preview é fiel ao que o usuário verá no projeto dele.
- O `srcdoc` é montado com um documento mínimo: `<meta charset>`, um CSS de reset curto, o `<style>` do componente, o HTML, e o `<script>` se houver.

Para a home, montar 24 iframes de uma vez é caro. Solução: um componente `<LazyPreview>` que só injeta o `srcdoc` quando o card entra no viewport (`IntersectionObserver`), exibindo um skeleton antes disso.

**Este é o item de maior risco técnico da etapa — recomenda-se prototipar `SandboxPreview` isoladamente antes de construir o restante da UI em cima dele**, validando fidelidade visual, performance com 24+ instâncias e comportamento em mobile.

---

## 9. Autenticação com Clerk

### Modelo

```
Browser                    Clerk                  Next.js              Express API
   │                         │                       │                      │
   ├─ /sign-in ─────────────▶│                       │                      │
   │◀─ sessão + cookie ──────┤                       │                      │
   ├─ GET /admin ───────────────────────────────────▶│                      │
   │                         │◀─ clerkMiddleware ────┤ (verifica sessão)    │
   │◀─ página do admin ──────────────────────────────┤                      │
   ├─ POST /api/admin/components (Bearer <token>) ──────────────────────────▶│
   │                         │                       │   verifyToken(JWKS)  │
   │                         │                       │   role === 'admin'?  │
   │◀─ 201 ─────────────────────────────────────────────────────────────────┤
```

### Frontend — `middleware.ts`

```ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isProtected = createRouteMatcher(['/admin(.*)']);

export default clerkMiddleware(async (auth, req) => {
  if (isProtected(req)) await auth.protect();
});

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)', '/(api|trpc)(.*)'],
};
```

A checagem de **autorização** (não só autenticação) acontece no `layout.tsx` de `/admin`:

```ts
const { sessionClaims } = await auth();
if (sessionClaims?.metadata?.role !== 'admin') notFound();
```

### Backend — substituição do middleware provisório

Esta etapa **substitui** qualquer middleware de auth provisório existente no backend pela verificação real do Clerk, mantendo a mesma interface (`req.auth.userId`, `req.auth.email`) para não exigir mudanças em controllers ou services:

```ts
// middlewares/require-admin.ts
import { verifyToken } from '@clerk/backend';

export async function requireAdmin(req, _res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return next(new UnauthorizedError());

  try {
    const claims = await verifyToken(token, {
      secretKey: env.CLERK_SECRET_KEY,
      authorizedParties: [env.WEB_ORIGIN],
    });
    if (claims.metadata?.role !== 'admin') return next(new ForbiddenError());

    req.auth = { userId: claims.sub, email: claims.email };
    next();
  } catch {
    next(new UnauthorizedError());
  }
}
```

A verificação é *networkless*: `@clerk/backend` busca o JWKS uma vez, cacheia e valida a assinatura localmente — nenhuma chamada de rede por request.

**Definição do papel:** `role: "admin"` fica no `publicMetadata` do usuário no dashboard do Clerk, exposto no token via *session token customization*. Nenhum usuário se auto-promove, pois `publicMetadata` só é gravável pela API server-side do Clerk.

**Sincronização com o banco:** logo após `requireAdmin`, um middleware `ensureLocalUser` faz `prisma.user.upsert({ where: { clerkId }, ... })` — preguiçoso, sem webhook.

---

## 10. Comunicação frontend ↔ backend

- REST/JSON sobre HTTP(S).
- Servidor do Next → API: usar `INTERNAL_API_URL` (rede interna, ex. `http://api:4000` em Docker).
- Browser → API (admin): usar `NEXT_PUBLIC_API_URL` diretamente, com `Authorization: Bearer <token do Clerk>`.
- `apps/web/src/lib/api-client.ts` centraliza os `fetch`, tipando request/response com os tipos derivados dos schemas Zod compartilhados, e tratando o envelope de erro padrão de forma uniforme para toda a UI.

---

## 11. Segurança do frontend

| Vetor | Controle |
|---|---|
| XSS no site | React escapa por padrão. **Zero uso de `dangerouslySetInnerHTML`** para código de componente — todo o código do catálogo vai para o `srcdoc` do iframe (Seção 8) |
| XSS via preview | `<iframe sandbox="allow-scripts">` sem `allow-same-origin`; CSP no documento do `srcdoc` bloqueando `connect-src` e `form-action` |
| CSP do site | `default-src 'self'`, `frame-src 'self' data:`, `img-src 'self' data: https:`, domínios do Clerk liberados em `script-src`/`connect-src` |
| Sanitização | `description` é renderizada como texto puro (sem Markdown/HTML), eliminando a necessidade de DOMPurify |
| CORS (lado API) | A API deve aceitar apenas `origin: WEB_ORIGIN` exato |

---

## 12. Docker (adição ao ambiente de desenvolvimento)

Adicionar ao `docker-compose.yml` já existente (serviço `web`, ao lado de `db` e `api`):

```yaml
  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
      target: dev
    container_name: uilib_web
    restart: unless-stopped
    env_file: .env
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:4000
      INTERNAL_API_URL: http://api:4000
    ports:
      - '3000:3000'
    volumes:
      - ./apps/web:/app/apps/web
      - ./packages:/app/packages
      - /app/node_modules
      - /app/apps/web/node_modules
    depends_on:
      - api
```

Duas URLs de API distintas: `NEXT_PUBLIC_API_URL` para o browser (localhost) e `INTERNAL_API_URL` para o servidor do Next (rede do Docker). Confundir as duas é a causa mais comum de "funciona no client mas quebra no SSR".

```dockerfile
# apps/web/Dockerfile (usa output: 'standalone' no next.config.ts)
FROM node:22-alpine AS base
RUN corepack enable && apk add --no-cache libc6-compat
WORKDIR /app

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile

FROM deps AS dev
COPY . .
EXPOSE 3000
CMD ["pnpm", "--filter", "@uilib/web", "dev"]
```

(O stage `build`/`prod` deste Dockerfile é detalhado na etapa Final, quando entra em produção.)

---

## 13. Variáveis de ambiente adicionadas nesta etapa

```bash
# ───── Clerk ─────
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/admin"

# ───── Web ─────
NEXT_PUBLIC_API_URL="http://localhost:4000"
INTERNAL_API_URL="http://api:4000"
NEXT_PUBLIC_SITE_URL="http://localhost:3000"

# ───── Revalidação de cache (compartilhado entre api e web) ─────
REVALIDATE_SECRET="troque-por-um-valor-aleatorio-longo"
```

`CLERK_SECRET_KEY` substitui/complementa a variável `DEV_ADMIN_TOKEN` usada em uma etapa anterior de desenvolvimento isolado do backend — a partir desta etapa, `DEV_ADMIN_TOKEN` deixa de ser usado e pode ser removida.

Variáveis `NEXT_PUBLIC_*` são embutidas no bundle do cliente em build time — nunca colocar segredo nelas (a `CLERK_SECRET_KEY`, por exemplo, nunca leva o prefixo `NEXT_PUBLIC_`).

---

## 14. Estratégia de testes desta etapa

| Camada | Ferramenta | Cobre |
|---|---|---|
| Componente | Vitest + Testing Library | `CopyPromptButton` chamando o clipboard e exibindo toast; `SearchBar` com debounce atualizando a URL; `CodeTabs` escondendo a aba JS quando vazia |
| Integração (API) | Vitest + Supertest | Autorização: 401 sem token, 403 com token sem role admin, 200 com token válido |
| E2E | Playwright | (1) home carrega e mostra cards; (2) busca filtra resultados; (3) detalhe renderiza preview e copia código; (4) copiar prompt; (5) login admin → criar componente → aparece publicado |

---

## 15. Entregável desta etapa (Definition of Done)

- [ ] `docker compose up` sobe banco + API + web com um único comando.
- [ ] Home com grid, busca, filtro por categoria e paginação funcionando contra a API real.
- [ ] Página de detalhes com preview em iframe sandbox, abas de código, Copy Code e Copy AI Prompt funcionando.
- [ ] Seletor de stack re-renderizando o prompt via API.
- [ ] Login de administrador via Clerk funcionando; rota `/admin` protegida por autenticação **e** autorização (`role`).
- [ ] CRUD completo de componentes e categorias na área administrativa, com preview ao vivo no formulário.
- [ ] Revalidação de cache disparada após mutações no admin.
- [ ] Os 5 cenários E2E da Seção 14 passando.
- [ ] Nenhuma configuração de AWS, CI/CD ou deploy ainda — isso é responsabilidade da etapa **Final**.
