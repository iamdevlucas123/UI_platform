# Descritivo Técnico — MVP: Biblioteca de Componentes UI com "Copy AI Prompt"

**Versão:** 1.0
**Data:** Agosto/2026
**Status:** Pronto para implementação

---

## Índice

1. [Visão geral do produto](#1-visão-geral-do-produto)
2. [Objetivo](#2-objetivo)
3. [Escopo](#3-escopo)
4. [Funcionalidades](#4-funcionalidades)
5. [Fluxos principais do usuário](#5-fluxos-principais-do-usuário)
6. [Arquitetura](#6-arquitetura)
7. [Stack tecnológica](#7-stack-tecnológica)
8. [Estrutura do projeto](#8-estrutura-do-projeto)
9. [Modelagem do banco de dados](#9-modelagem-do-banco-de-dados)
10. [Schema Prisma](#10-schema-prisma)
11. [Principais endpoints da API](#11-principais-endpoints-da-api)
12. [Autenticação](#12-autenticação)
13. [Segurança](#13-segurança)
14. [Estratégia de Docker](#14-estratégia-de-docker)
15. [Arquitetura AWS](#15-arquitetura-aws)
16. [Estratégia de deploy](#16-estratégia-de-deploy)
17. [Variáveis de ambiente](#17-variáveis-de-ambiente)
18. [Estratégia de testes](#18-estratégia-de-testes)
19. [Estratégia de CI/CD](#19-estratégia-de-cicd)
20. [Roadmap de implementação](#20-roadmap-de-implementação)
21. [Fora do escopo do MVP](#21-fora-do-escopo-do-mvp)
22. [Possíveis evoluções futuras](#22-possíveis-evoluções-futuras)

---

## 1. Visão geral do produto

Uma biblioteca web pública de componentes de interface autorais. O visitante navega por categorias, pesquisa, visualiza uma prévia funcional de cada componente e, ao abrir a página de detalhes, pode **copiar o código** ou **copiar um prompt pronto** para colar em uma IA de programação (Claude Code, Cursor, Copilot, etc.), que implementará aquele componente dentro do projeto dele.

O diferencial não é o catálogo em si — é a **ponte entre o catálogo e o agente de IA do usuário**. O produto entrega um artefato de texto (prompt) autocontido e determinístico, sem qualquer chamada a LLM do nosso lado. Isso mantém o custo operacional próximo de zero e elimina toda a complexidade de integração, chaves de API, streaming e rate limiting de provedores.

Analogia útil: o site funciona como um *catálogo de peças* com uma *ficha de montagem* anexada. Nós não montamos a peça no carro do cliente; entregamos a peça e uma instrução tão precisa que o mecânico dele (a IA) consegue montar sem improvisar.

### Personas

| Persona | Necessidade | Frequência de uso |
|---|---|---|
| **Visitante / Desenvolvedor** | Encontrar um componente visualmente bonito e colocá-lo no projeto dele em minutos | Alta (tráfego anônimo, sem login) |
| **Administrador (você)** | Cadastrar, editar e publicar componentes e categorias | Baixa (1 usuário, poucas escritas por dia) |

Essa assimetria — **leitura massiva e anônima vs. escrita rara e autenticada** — é a premissa que guia praticamente todas as decisões arquiteturais deste documento: cache agressivo no público, simplicidade absoluta no administrativo.

---

## 2. Objetivo

Colocar no ar, com baixo custo e baixa complexidade, um MVP funcional que permita:

1. Publicar componentes UI autorais organizados por categoria.
2. Permitir que qualquer visitante encontre, visualize e copie esses componentes.
3. Entregar um prompt de IA reutilizável e de alta qualidade por componente.
4. Administrar todo o conteúdo por uma área interna simples.

**Critérios de sucesso técnico do MVP:**

- Custo de infraestrutura ≤ US$ 40/mês.
- Time to First Byte da home < 500 ms (com cache).
- Um desenvolvedor novo sobe o ambiente local com `docker compose up` e no máximo um `.env` copiado.
- Deploy de uma alteração em produção em < 10 minutos, automatizado.

---

## 3. Escopo

### Dentro do MVP

- Catálogo público: home, listagem, busca textual, filtro por categoria, paginação.
- Página de detalhes do componente com preview funcional, código e prompt.
- Botões de copiar código e copiar prompt de IA.
- Área administrativa protegida com CRUD de componentes e categorias.
- Rascunho/publicado para componentes.
- API REST em Express + Prisma + PostgreSQL.
- Deploy em AWS com HTTPS, backups de banco e CI/CD.

### Fora do MVP

Ver [Seção 21](#21-fora-do-escopo-do-mvp).

### Premissas assumidas

| # | Premissa | Impacto se falsa |
|---|---|---|
| P1 | Apenas o dono do projeto cria componentes (1 admin) | Se houver múltiplos autores, é preciso papéis e moderação |
| P2 | Volume inicial: dezenas a poucas centenas de componentes | Se forem dezenas de milhares, a busca `ILIKE`/trigram precisa virar full-text ou motor externo |
| P3 | Componentes são autorais e confiáveis (não há UGC) | Se houver conteúdo de terceiros, o sandbox de preview passa a ser crítico, não apenas defensivo |
| P4 | Tráfego inicial baixo/moderado | Uma única instância EC2 é suficiente |

---

## 4. Funcionalidades

### 4.1 Home / Biblioteca (pública)

- Grid responsivo de cards de componentes, cada card com **preview visual ao vivo** (não screenshot).
- Barra de busca (nome + descrição), com debounce e estado refletido na URL (`?q=`).
- Lista de categorias como filtro (`/category/[slug]` ou `?category=`).
- Ordenação: mais recentes (padrão) e alfabética.
- Paginação por página (`?page=`), 24 itens por página.
- Estados vazios, de carregamento (skeleton) e de erro.

### 4.2 Página de detalhes do componente (pública)

Rota: `/component/[slug]`. Contém:

- Nome, categoria (link) e descrição.
- **Preview funcional** em área ampla, com alternância de fundo claro/escuro.
- **Código** com syntax highlight, em abas: `HTML`, `CSS` e `JS` (aba JS só aparece se houver).
- Lista de tecnologias utilizadas (tags).
- Botão **Copy Code** (copia HTML + CSS + JS concatenados, prontos para colar).
- Botão **Copy AI Prompt**.
- Seletor opcional de stack de destino (framework e estilização) que personaliza o prompt copiado.
- Metadados de SEO: `<title>`, description, Open Graph e JSON-LD.

### 4.3 Prompt para IA

O prompt é **gerado a partir de um template**, não escrito à mão duas vezes. Cada componente tem um campo `promptTemplate` opcional; quando ele é nulo, o sistema aplica o template global padrão.

**Por que template em vez de texto fixo salvo no banco:** se o prompt fosse texto estático por componente, melhorar a redação do prompt (algo que certamente acontecerá várias vezes) exigiria reeditar todos os componentes um a um. Com template + variáveis, uma melhoria global vale para o catálogo inteiro imediatamente. O campo por componente continua existindo para casos que exijam instruções específicas (ex.: um componente que depende de uma keyframe animation complexa).

**Variáveis disponíveis no template:**

| Variável | Origem |
|---|---|
| `{{name}}` | `Component.name` |
| `{{category}}` | `Category.name` |
| `{{description}}` | `Component.description` |
| `{{technologies}}` | `Component.technologies` (lista) |
| `{{html}}` / `{{css}}` / `{{js}}` | código-fonte do componente |
| `{{targetFramework}}` | escolha do usuário (default: `React`) |
| `{{targetStyling}}` | escolha do usuário (default: `Tailwind CSS`) |
| `{{sourceUrl}}` | URL canônica da página do componente |

**Template global padrão (v1):**

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

O usuário clica em **Copy AI Prompt**, o texto vai para o clipboard via `navigator.clipboard.writeText()`, e um toast confirma a ação. Não há chamada a nenhum LLM.

### 4.4 Área administrativa

Rota: `/admin/*`, protegida por Clerk.

- Login via Clerk (`/sign-in`).
- Dashboard simples: contagem de componentes por status e por categoria.
- **Componentes:** listagem com busca e filtro por status; formulário de criação/edição com campos `name`, `slug` (auto-gerado, editável), `description`, `category`, `technologies`, `html`, `css`, `js`, `promptTemplate` (opcional) e `status`; exclusão com confirmação.
- **Preview ao vivo dentro do formulário**, atualizado com debounce enquanto se digita HTML/CSS/JS. Justificativa: sem isso, cadastrar um componente vira um ciclo de salvar → abrir outra aba → conferir → voltar. É a única funcionalidade "extra" do admin e ela paga a si mesma já no terceiro componente cadastrado.
- **Categorias:** CRUD com `name`, `slug`, `description`, `position` (ordem de exibição). Exclusão bloqueada se houver componentes associados.

Não há workflow de aprovação, versionamento, histórico ou editor visual.

---

## 5. Fluxos principais do usuário

### Fluxo 1 — Descoberta e uso de um componente (visitante)

```
1. Usuário acessa a home
   → Next.js entrega a página do cache ISR (HTML já renderizado)
2. Vê o grid de componentes com previews ao vivo
   → cada card monta um <iframe sandbox> apenas quando entra no viewport
3. Digita "toggle neon" na busca
   → debounce 300ms → atualiza a URL → refetch server-side
4. Clica em um card
   → navega para /component/[slug]
5. Analisa o preview em tamanho maior, alterna fundo claro/escuro
6. Escolhe a stack de destino (React + Tailwind)
7. Clica em "Copy AI Prompt"
   → prompt renderizado com as variáveis → clipboard → toast de confirmação
8. Cola no agente de IA dentro do próprio projeto
   → componente implementado
```

### Fluxo 2 — Cópia direta do código

```
1..5 (idêntico ao Fluxo 1)
6. Clica na aba CSS, revisa o código
7. Clica em "Copy Code" → HTML + CSS + JS concatenados no clipboard
8. Cola manualmente no projeto
```

### Fluxo 3 — Publicação de um componente (admin)

```
1. Admin acessa /admin → Clerk middleware verifica sessão
   → sem sessão: redireciona para /sign-in
   → com sessão sem role=admin: 403
2. Clica em "Novo componente"
3. Preenche nome (slug auto-gerado), descrição, categoria, tecnologias
4. Cola HTML e CSS → preview ao vivo renderiza ao lado
5. Salva como DRAFT
   → POST /api/admin/components com Bearer token do Clerk
   → Zod valida → Prisma persiste
6. Revisa a página do componente com ?preview=1
7. Altera status para PUBLISHED
   → PUT /api/admin/components/:id
   → API dispara revalidação de cache do Next
8. Componente aparece publicamente em segundos
```

### Fluxo 4 — Erro e recuperação

```
- API fora do ar → páginas públicas continuam servindo do cache ISR
  (stale-while-revalidate); banner discreto só aparece se o fetch falhar
  em navegação client-side
- Slug duplicado no admin → 409 com mensagem no campo, sem perder o formulário
- Categoria com componentes → DELETE retorna 409 explicando o bloqueio
```

---

## 6. Arquitetura

### 6.1 Visão geral

```
                        ┌──────────────────────┐
   Visitante ──HTTPS──▶ │   Route 53 + DNS      │
                        └───────────┬──────────┘
                                    │
                        ┌───────────▼──────────────────────┐
                        │        EC2 t4g.small             │
                        │  ┌────────────────────────────┐  │
                        │  │ Caddy (TLS, Let's Encrypt) │  │
                        │  └───────┬────────────┬───────┘  │
                        │          │            │          │
                        │   ┌──────▼─────┐ ┌────▼───────┐  │
                        │   │ web        │ │ api        │  │
                        │   │ Next.js    │─▶│ Express   │  │
                        │   │ :3000      │ │ :4000      │  │
                        │   └────────────┘ └─────┬──────┘  │
                        └────────────────────────┼─────────┘
                                                 │ Prisma
                                    ┌────────────▼──────────┐
                                    │  RDS PostgreSQL 16    │
                                    │  db.t4g.micro         │
                                    └───────────────────────┘
   Clerk (SaaS) ◀── auth admin ──── web + api
```

Uma única aplicação por camada, um único host, um único banco. **Sem microsserviços, sem filas, sem cache distribuído, sem CDN obrigatória no MVP.**

### 6.2 Decisão-chave: por que Express separado do Next.js?

Esta é a decisão mais discutível do documento, então vale explicitá-la.

| Opção | Prós | Contras |
|---|---|---|
| **A. Só Next.js (Route Handlers + Server Actions)** | Um deploy, um processo, menos código, tipagem end-to-end trivial | Prisma acoplado ao runtime do Next; API não reutilizável fora do site; escalar leitura e escrita juntas |
| **B. Next.js + Express separados** *(escolhida)* | Domínio isolado do framework de UI; API pública consumível por CLI/MCP/mobile no futuro; deploy e escala independentes; requisito da stack | Dois processos, dois Dockerfiles, um contrato HTTP a manter |

**Escolha: B.** Além de ser a stack requisitada, a API é o ativo de longo prazo aqui: a evolução natural deste produto (CLI de instalação, servidor MCP, registry compatível com shadcn) consome exatamente os mesmos endpoints. Amarrar isso dentro do Next significaria refatorar depois.

**Mitigação do principal contra (contrato duplicado):** um pacote compartilhado `packages/shared` com os schemas Zod e os tipos derivados (`z.infer`). O backend valida a entrada com o mesmo schema que o frontend usa para tipar a resposta. É uma fonte única de verdade sem introduzir tRPC ou geração de código.

### 6.3 Estrutura do frontend

Next.js 15 com **App Router**.

| Rota | Renderização | Justificativa |
|---|---|---|
| `/` | ISR (`revalidate: 300`) | Conteúdo muda raramente; cache absorve todo o tráfego |
| `/category/[slug]` | ISR + `generateStaticParams` | Poucas categorias, todas pré-renderizadas |
| `/component/[slug]` | ISR + `generateStaticParams` | Páginas de maior valor de SEO |
| `/?q=...` (busca) | Dinâmica (server component com `searchParams`) | Combinações infinitas; não faz sentido cachear |
| `/admin/*` | Dinâmica, client-heavy, `noindex` | Dados sempre frescos, sessão obrigatória |

**Componentes públicos** buscam dados via `fetch` no servidor (Server Components), com `next: { tags: ['components'] }`. Após qualquer mutação no admin, a API chama um endpoint interno de revalidação do Next que executa `revalidateTag('components')`, protegido por um secret compartilhado. Isso dá cache agressivo **e** publicação praticamente instantânea, com ~30 linhas de código.

**Renderização do preview — a decisão técnica mais importante do frontend:**

Cada preview vive em um `<iframe sandbox="allow-scripts" srcdoc="...">`, **sem** `allow-same-origin`. Consequências:

- O conteúdo do iframe cai em uma origem opaca: não acessa `document.cookie`, `localStorage` nem o DOM da página pai. Mesmo que um componente futuro traga JS malicioso, o dano fica contido.
- O CSS do componente não vaza para o site e o CSS do site não interfere no componente. O preview é fiel ao que o usuário verá no projeto dele.
- O `srcdoc` é montado com um documento mínimo: `<meta charset>`, um CSS de reset curto, o `<style>` do componente, o HTML e, se houver, o `<script>`.

Para o grid, montar 24 iframes de uma vez é caro. Solução: um componente `<LazyPreview>` que só injeta o `srcdoc` quando o card entra no viewport (`IntersectionObserver`), exibindo um skeleton antes disso. Isso mantém a home leve mesmo com dezenas de previews.

### 6.4 Estrutura do backend

Express 5 organizado **por módulo de domínio**, não por tipo de arquivo. Cada módulo é uma pasta autocontida com rota, controller, service, repositório e schemas.

```
Request
  → middleware global (helmet, cors, rate limit, request-id, pino-http)
  → router do módulo
  → middleware de auth (só em /api/admin/*)
  → middleware validate(schema) — Zod
  → controller  (traduz HTTP ↔ domínio; não contém regra de negócio)
  → service     (regra de negócio; onde vive a lógica de slug, publicação, prompt)
  → repository  (único lugar que toca o Prisma Client)
  → middleware de erro (mapeia exceções de domínio → status HTTP + payload padrão)
```

**Por que separar service de repository num MVP?** Porque é barato agora e caro depois. O service é onde a regra "não pode publicar sem HTML" ou "gerar o prompt a partir do template" vive, e é o que se testa unitariamente sem subir banco. A camada de repositório existe para que trocar uma query Prisma por SQL bruto (provável na busca, quando crescer) não vaze para o resto do código. São duas pastas a mais, não uma arquitetura hexagonal completa.

### 6.5 Comunicação frontend ↔ backend

- REST/JSON sobre HTTPS.
- Público: servidor do Next → API por rede interna do Docker (`http://api:4000`) em produção, evitando ida e volta pela internet.
- Admin: browser → API diretamente, com `Authorization: Bearer <token do Clerk>`.
- Envelope de resposta padronizado:

```jsonc
// sucesso (lista)
{ "data": [...], "meta": { "page": 1, "limit": 24, "total": 137, "totalPages": 6 } }

// sucesso (item)
{ "data": { ... } }

// erro
{ "error": { "code": "VALIDATION_ERROR", "message": "Invalid payload",
             "details": [{ "path": "slug", "message": "Slug already in use" }] } }
```

Um envelope único evita que cada tela do frontend precise de um tratamento de erro diferente.

### 6.6 Upload e armazenamento de imagens

**Decisão: o MVP não faz upload de imagens.** O preview é o próprio código renderizado, então não existe thumbnail para armazenar. Isso remove S3, credenciais IAM, presigned URLs e processamento de imagem inteiros do escopo inicial.

Duas exceções tratadas sem upload:

- **Imagens dentro de um componente:** o admin usa data-URI, SVG inline ou URL externa dentro do HTML. Suficiente para o padrão de componentes CSS-first.
- **Imagem de Open Graph:** gerada dinamicamente pelo Next com `ImageResponse` (`opengraph-image.tsx`), renderizando nome + categoria em um layout tipográfico. Zero armazenamento.

Se no futuro for necessário upload (ex.: capturas estáticas para compartilhamento), o desenho já está definido: `POST /api/admin/uploads/presign` devolve uma presigned URL do S3, o browser faz `PUT` direto, e só a key volta para a API. Nada disso entra no MVP.

---

## 7. Stack tecnológica

### Frontend

| Item | Escolha | Alternativa considerada | Motivo da escolha |
|---|---|---|---|
| Framework | **Next.js 15 (App Router)** | Vite + React Router | SEO e ISR são essenciais para um catálogo público; Vite exigiria SSR manual |
| Linguagem | **TypeScript (strict)** | — | Requisito |
| Estilo | **Tailwind CSS v4** | CSS Modules | Velocidade de iteração; o CSS dos componentes é isolado no iframe, então não há conflito |
| Componentes de UI | **shadcn/ui (subset)** | MUI, Chakra | Código copiado para o repo, sem dependência pesada; usar só o necessário: button, input, dialog, tabs, select, toast |
| Syntax highlight | **Shiki** | Prism, highlight.js | Highlight no servidor → zero JS no cliente e HTML já colorido no ISR |
| Ícones | **lucide-react** | — | Leve, tree-shakeable |
| Estado de servidor (admin) | **TanStack Query** | SWR, fetch manual | Só no `/admin`: cache, invalidação e estados de mutação prontos |
| Formulários (admin) | **React Hook Form + Zod resolver** | Formik | Reaproveita os schemas Zod do `packages/shared` |

### Backend

| Item | Escolha | Alternativa considerada | Motivo da escolha |
|---|---|---|---|
| Runtime | **Node.js 22 LTS** | Bun, Deno | Maturidade e compatibilidade com Prisma |
| Framework | **Express 5** | Fastify, NestJS | Requisito; Express 5 já trata async errors nativamente. NestJS seria overengineering para 8 endpoints |
| ORM | **Prisma 6** | Drizzle, Kysely | Requisito; migrations e tipagem excelentes |
| Validação | **Zod** | Joi, class-validator | Infere tipos TS; compartilhável com o frontend |
| Auth | **Clerk (`@clerk/backend`)** | Auth.js, JWT próprio | Requisito; verificação networkless via JWKS |
| Logs | **Pino + pino-http** | Winston, console.log | JSON estruturado, baixo overhead, request-id correlacionado |
| Rate limit | **express-rate-limit** (memória) | Redis + rate-limiter-flexible | Instância única no MVP; Redis seria infra a mais sem ganho |
| Segurança HTTP | **helmet + cors** | manual | Padrão da indústria |

### Banco e infraestrutura

| Item | Escolha | Motivo |
|---|---|---|
| Banco | **PostgreSQL 16 (RDS)** | Requisito; extensão `pg_trgm` cobre a busca do MVP |
| Container | **Docker + Docker Compose** | Requisito; mesma definição em dev e prod |
| Reverse proxy | **Caddy 2** | TLS automático via Let's Encrypt, config de 10 linhas |
| Cloud | **AWS (EC2 + RDS + Route 53)** | Requisito; ver [Seção 15](#15-arquitetura-aws) |
| CI/CD | **GitHub Actions + GHCR** | Gratuito para repositório privado dentro da cota; sem custo de ECR |
| Gerenciador de pacotes | **pnpm 9 + workspaces** | Monorepo leve, instalação rápida, sem Turborepo/Nx no MVP |
| Erros em produção | **Sentry (plano free)** | Sem observabilidade mínima, bug em produção só aparece via reclamação |

---

## 8. Estrutura do projeto

Monorepo pnpm com dois apps e um pacote compartilhado.

```
ui-library/
├── apps/
│   ├── web/                          # Next.js
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── page.tsx                    # home + busca
│   │   │   │   ├── opengraph-image.tsx
│   │   │   │   ├── category/[slug]/page.tsx
│   │   │   │   ├── component/[slug]/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── opengraph-image.tsx
│   │   │   │   ├── sign-in/[[...sign-in]]/page.tsx
│   │   │   │   ├── admin/
│   │   │   │   │   ├── layout.tsx              # guard de role
│   │   │   │   │   ├── page.tsx                # dashboard
│   │   │   │   │   ├── components/
│   │   │   │   │   │   ├── page.tsx
│   │   │   │   │   │   ├── new/page.tsx
│   │   │   │   │   │   └── [id]/edit/page.tsx
│   │   │   │   │   └── categories/page.tsx
│   │   │   │   ├── api/revalidate/route.ts     # revalidação sob demanda
│   │   │   │   ├── sitemap.ts
│   │   │   │   └── robots.ts
│   │   │   ├── components/
│   │   │   │   ├── ui/                         # shadcn
│   │   │   │   ├── catalog/                    # ComponentCard, Grid, SearchBar, CategoryNav
│   │   │   │   ├── preview/                    # SandboxPreview, LazyPreview, ThemeToggle
│   │   │   │   ├── code/                       # CodeTabs, CopyCodeButton
│   │   │   │   ├── prompt/                     # CopyPromptButton, StackSelector
│   │   │   │   └── admin/                      # ComponentForm, CategoryForm, DataTable
│   │   │   ├── lib/
│   │   │   │   ├── api-client.ts               # wrapper de fetch tipado
│   │   │   │   ├── build-srcdoc.ts             # monta o documento do iframe
│   │   │   │   ├── render-prompt.ts            # substitui variáveis do template
│   │   │   │   ├── copy-to-clipboard.ts
│   │   │   │   └── env.ts                      # validação de env com Zod
│   │   │   └── middleware.ts                   # clerkMiddleware
│   │   ├── Dockerfile
│   │   └── next.config.ts
│   │
│   └── api/                          # Express
│       ├── src/
│       │   ├── server.ts                       # bootstrap + graceful shutdown
│       │   ├── app.ts                          # montagem do Express
│       │   ├── config/env.ts                   # validação de env com Zod
│       │   ├── lib/
│       │   │   ├── prisma.ts
│       │   │   ├── logger.ts
│       │   │   ├── errors.ts                   # AppError, NotFound, Conflict...
│       │   │   ├── slug.ts
│       │   │   └── revalidate.ts               # notifica o Next
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
│       │   │   ├── categories/…
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
├── infra/
│   ├── Caddyfile
│   ├── docker-compose.prod.yml
│   └── README.md                     # passo a passo de provisionamento AWS
│
├── .github/workflows/
│   ├── ci.yml
│   └── deploy.yml
│
├── docker-compose.yml                # ambiente de desenvolvimento
├── .env.example
├── pnpm-workspace.yaml
├── package.json
└── README.md
```

**Por que monorepo e não dois repositórios:** o pacote `shared` é a razão. Com dois repos, sincronizar schemas exige publicar um pacote npm privado ou copiar arquivos — atrito diário para um time de uma pessoa. O pnpm workspace resolve isso com um symlink e zero infraestrutura. Não uso Turborepo no MVP: os scripts de build são dois e `pnpm -r` já dá conta.

---

## 9. Modelagem do banco de dados

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
        │                              │
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

### Decisões de modelagem

**1. `html`, `css` e `js` em colunas separadas, e não um campo `code` genérico.**

Esta é a simplificação central do MVP. Os componentes são autorais e definidos como **HTML + CSS puro (+ JS opcional)**, no mesmo modelo do Uiverse. Isso significa que **o código exibido é literalmente o código renderizado no preview** — não existe duplicação entre "fonte" e "preview", e portanto não existe a possibilidade de eles divergirem. A conversão para React/Vue/Svelte é responsabilidade do prompt de IA, que é exatamente o produto que estamos vendendo. Um campo `code` único obrigaria a fazer parsing para montar o preview; três colunas eliminam esse problema inteiro.

**2. `technologies` como `String[]` nativo do Postgres, e não uma tabela `Technology` com N:N.**

O MVP não pede filtro por tecnologia — apenas exibição de tags. Uma tabela + join table adicionaria duas entidades, um endpoint de gestão e joins em toda listagem, para entregar uma lista de strings. Se depois surgir filtro por tecnologia, a migração é uma query de normalização de meia hora.

**3. `ComponentVersion`: NÃO entra no MVP.**

O prompt pedia inclusão apenas se houvesse justificativa clara. Não há. Com um único autor, sem consumidores externos travados numa versão específica e sem necessidade de rollback de conteúdo, versionamento seria uma tabela extra, uma FK de "versão atual", lógica de criação de versão em cada edição e telas de comparação — tudo para um caso de uso que não existe. O que realmente protege contra erro humano no MVP é o backup automático do RDS (PITR de 7 dias). Versionamento passa a valer a pena quando existir CLI/registry: aí um usuário que instalou a v1 precisa poder reinstalá-la.

**4. `User` mínimo, sincronizado a partir do Clerk.**

O Clerk é a fonte de verdade da identidade. A tabela `User` local existe por dois motivos concretos: permitir a FK `Component.authorId` (autoria/auditoria de quem publicou o quê) e evitar chamadas à API do Clerk só para exibir um nome numa listagem. É preenchida por *upsert* preguiçoso: na primeira escrita autenticada, o middleware garante que existe um `User` com aquele `clerkId`. Nenhum webhook é necessário no MVP.

**5. `status` (DRAFT/PUBLISHED) + `publishedAt`.**

Custa uma coluna e um enum, e entrega a capacidade de preparar componentes sem expô-los ao público — algo que se usa desde o primeiro dia de cadastro em lote. Endpoints públicos filtram `status = PUBLISHED` sempre.

**6. `onDelete: Restrict` em `Category → Component`.**

Deletar uma categoria não pode apagar componentes silenciosamente. A API retorna 409 e instrui a mover ou remover os componentes antes.

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

**Estratégia de busca:** `ILIKE '%termo%'` sobre `name` e `description`, acelerado por índices GIN trigram (extensão `pg_trgm`). Para centenas ou poucos milhares de registros isso é instantâneo e não exige coluna `tsvector`, triggers, configuração de dicionário nem serviço externo. Quando o catálogo passar de ~10 mil componentes ou a busca por relevância virar requisito, o caminho é uma coluna gerada `tsvector` com `websearch_to_tsquery` — a troca fica contida no repositório.

---

## 10. Schema Prisma

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

### Migration adicional para a busca

`prisma migrate dev --create-only` e então editar o SQL gerado (ou criar uma migration vazia):

```sql
-- apps/api/prisma/migrations/xxxx_add_trigram_search/migration.sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX components_name_trgm_idx
  ON "components" USING GIN (name gin_trgm_ops);

CREATE INDEX components_description_trgm_idx
  ON "components" USING GIN (description gin_trgm_ops);
```

### Seed

`prisma/seed.ts` cria as 14 categorias iniciais na ordem definida e 2–3 componentes de exemplo por categoria (o suficiente para desenvolver o frontend sem cadastro manual):

```ts
const CATEGORIES = [
  'Animation', 'Text Animation', 'Buttons', 'Components', 'Checkboxes',
  'Toggle Switches', 'Cards', 'Loaders', 'Inputs', 'Radio Buttons',
  'Forms', 'Patterns', 'Tooltips', 'UI Kits',
] as const;
```

O seed é **idempotente** (`upsert` por slug), para poder rodar em qualquer ambiente sem duplicar dados.

---

## 11. Principais endpoints da API

Base: `/api`. Formato: JSON. Todos os endpoints públicos aceitam apenas leitura.

### Resumo

| Método | Rota | Auth | Objetivo |
|---|---|---|---|
| GET | `/api/health` | — | Health check para deploy e monitoramento |
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

Treze endpoints, nenhum supérfluo. Não há `PATCH` separado para publicar: `status` é um campo do `PUT`.

---

### 11.1 `GET /api/components`

**Objetivo:** alimentar a home, a busca e as páginas de categoria.

**Query params:**

| Param | Tipo | Default | Regras |
|---|---|---|---|
| `q` | string | — | 1–100 chars; trim; ignorado se vazio |
| `category` | string (slug) | — | Deve existir; se não existir → 404 |
| `page` | int | `1` | ≥ 1 |
| `limit` | int | `24` | 1–48 (teto evita payload gigante por causa do HTML/CSS embutido) |
| `sort` | enum | `recent` | `recent` \| `name` |

**Autenticação:** nenhuma. Retorna **apenas** `status = PUBLISHED`.

**Response `200`:**

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

**Nota de design:** o código do preview vai na listagem porque os cards renderizam previews ao vivo. Uma alternativa seria um segundo request por card — 24 round-trips em vez de 1. Com compressão gzip/brotli ativada no Express, um payload de 24 componentes fica na casa de dezenas de KB. O teto de `limit=48` existe justamente para limitar esse crescimento.

**Erros:** `400` (params inválidos), `404` (categoria inexistente).

---

### 11.2 `GET /api/components/:slug`

**Objetivo:** página de detalhes.

**Params:** `slug` (path).
**Query:** `preview=1` — permite ao admin visualizar um DRAFT; exige token válido, caso contrário é ignorado.

**Response `200`:**

```jsonc
{
  "data": {
    "id": "clx...",
    "name": "Neon Toggle Switch",
    "slug": "neon-toggle-switch",
    "description": "…",
    "html": "…", "css": "…", "js": null,
    "technologies": ["HTML", "CSS", "CSS Animation"],
    "category": { "id": "clx...", "name": "Toggle Switches", "slug": "toggle-switches" },
    "prompt": "You are working inside an existing codebase…",
    "createdAt": "2026-08-01T12:00:00.000Z",
    "updatedAt": "2026-08-02T09:30:00.000Z"
  }
}
```

O campo `prompt` já vem renderizado com os defaults (`React` + `Tailwind CSS`), de modo que a página funciona mesmo sem JavaScript e o botão de copiar é instantâneo no caso comum.

**Erros:** `404` (não existe ou não publicado).

---

### 11.3 `GET /api/components/:slug/prompt`

**Objetivo:** re-renderizar o prompt quando o usuário troca a stack de destino.

**Query params:**

| Param | Tipo | Default | Valores |
|---|---|---|---|
| `framework` | enum | `react` | `react` \| `vue` \| `svelte` \| `angular` \| `html` |
| `styling` | enum | `tailwind` | `tailwind` \| `css` \| `css-modules` \| `styled-components` |

**Response `200`:** `{ "data": { "prompt": "…" } }`

**Justificativa deste endpoint:** a renderização poderia acontecer no cliente, mas mantê-la no servidor garante uma única implementação do template (a mesma usada no `GET /:slug`) e permite melhorar o prompt sem novo deploy do frontend. É um endpoint de leitura pura, cacheável por CDN no futuro.

**Erros:** `400` (enum inválido), `404`.

---

### 11.4 `GET /api/categories`

**Objetivo:** navegação e filtros.

**Response `200`:**

```jsonc
{
  "data": [
    { "id": "clx…", "name": "Buttons", "slug": "buttons",
      "description": null, "position": 3, "componentCount": 24 }
  ]
}
```

`componentCount` conta apenas publicados (`_count` com filtro no Prisma). Isso permite esconder categorias vazias na home sem um segundo request.

---

### 11.5 `POST /api/admin/components`

**Objetivo:** criar componente.
**Auth:** Bearer token do Clerk + `role = admin`.

**Request:**

```jsonc
{
  "name": "Neon Toggle Switch",
  "slug": "neon-toggle-switch",          // opcional: derivado de name se omitido
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

Regras de negócio no service:
- Se `status = PUBLISHED` e `publishedAt` nulo → define `publishedAt = now()`.
- `authorId` vem do token, nunca do body.
- Slug é normalizado (lowercase, remoção de acentos) antes da validação de unicidade.

**Response `201`:** `{ "data": { …componente completo… } }`
**Erros:** `400`, `401`, `403`, `409` (slug), `422` (categoria inexistente).

---

### 11.6 `PUT /api/admin/components/:id`

Mesmo corpo do `POST`, com todos os campos opcionais exceto os enviados (semântica de substituição parcial validada por `schema.partial()`).

Regras adicionais:
- Transição `DRAFT → PUBLISHED` define `publishedAt` se ainda nulo.
- Transição `PUBLISHED → DRAFT` mantém `publishedAt` (histórico da primeira publicação).
- Qualquer alteração dispara revalidação do cache do Next.

**Response `200`.** **Erros:** `400`, `401`, `403`, `404`, `409`, `422`.

---

### 11.7 `DELETE /api/admin/components/:id`

**Response `204`** (sem corpo). **Erros:** `401`, `403`, `404`.
Exclusão é física (hard delete). Soft delete não se justifica: o backup do RDS cobre o cenário de arrependimento, e uma flag `deletedAt` contaminaria todas as queries.

---

### 11.8 Endpoints de categoria

`POST /api/admin/categories` — `{ name (2–50, único), slug (opcional, derivado), description (opcional, ≤300), position (int, default 0) }` → `201`.

`PUT /api/admin/categories/:id` — campos parciais → `200`.

`DELETE /api/admin/categories/:id` → `204`; retorna **`409 CATEGORY_IN_USE`** se houver qualquer componente associado, com `details.componentCount` para a mensagem da UI.

---

### 11.9 `GET /api/health`

`200` com `{ "status": "ok", "uptime": 1234, "db": "ok" }`. Executa `SELECT 1` no Postgres. Usado pelo healthcheck do Docker e pelo deploy para decidir se o novo container subiu corretamente.

---

## 12. Autenticação

### Modelo

Clerk é o provedor de identidade. Não armazenamos senhas, não implementamos fluxo de reset, não geramos JWT próprio.

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

### Frontend

`apps/web/src/middleware.ts`:

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

O `layout.tsx` de `/admin` faz a segunda checagem — a de **autorização**:

```ts
const { sessionClaims } = await auth();
if (sessionClaims?.metadata?.role !== 'admin') notFound();
```

### Backend

Verificação *networkless*: `@clerk/backend` busca o JWKS uma vez, cacheia e valida a assinatura localmente. Nenhuma chamada de rede por request.

```ts
// middlewares/require-admin.ts
import { verifyToken } from '@clerk/backend';

export async function requireAdmin(req, _res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return next(new UnauthorizedError());

  try {
    const claims = await verifyToken(token, {
      secretKey: env.CLERK_SECRET_KEY,
      authorizedParties: [env.WEB_ORIGIN],   // impede token de outro app
    });
    if (claims.metadata?.role !== 'admin') return next(new ForbiddenError());

    req.auth = { userId: claims.sub, email: claims.email };
    next();
  } catch {
    next(new UnauthorizedError());
  }
}
```

**Definição do papel:** o `role: "admin"` fica no `publicMetadata` do usuário no dashboard do Clerk, e é exposto no token via *session token customization*. Nenhum usuário consegue se auto-promover, porque `publicMetadata` só é gravável pela API server-side do Clerk.

**Sincronização com o banco:** logo após `requireAdmin`, um middleware `ensureLocalUser` faz `prisma.user.upsert({ where: { clerkId }, ... })`. Preguiçoso, sem webhook, sem estado a reconciliar.

**Por que Clerk e não Auth.js/JWT próprio:** para um único administrador, construir signup, hash de senha, reset por e-mail, MFA e rotação de sessão é dias de trabalho e uma superfície de ataque desnecessária. O plano free do Clerk cobre folgadamente o volume, e a validação por JWKS não adiciona latência.

---

## 13. Segurança

| Vetor | Controle no MVP |
|---|---|
| **Autenticação** | Clerk; nenhuma rota administrativa acessível sem token válido |
| **Autorização** | Checagem de `role === 'admin'` no Next (UX) **e** na API (obrigatória). A API nunca confia no frontend |
| **Validação de entrada** | Zod em 100% dos endpoints com body ou query. `express.json({ limit: '1mb' })` |
| **SQL Injection** | Prisma Client com queries parametrizadas. Onde for necessário SQL bruto, usar `Prisma.sql` com template tag — nunca concatenação de strings |
| **XSS no site** | React escapa por padrão. **Zero uso de `dangerouslySetInnerHTML`** para conteúdo de componente — todo o código do componente vai para o `srcdoc` de um iframe |
| **XSS via preview** | `<iframe sandbox="allow-scripts">` **sem** `allow-same-origin`: origem opaca, sem acesso a cookies, storage ou DOM pai. Além disso, CSP no documento do srcdoc bloqueando `connect-src` e `form-action` |
| **CSP do site** | Header via `next.config.ts`/Caddy: `default-src 'self'`, `frame-src 'self' data:`, `img-src 'self' data: https:`, domínios do Clerk permitidos em `script-src`/`connect-src` |
| **Sanitização** | `description` é renderizada como texto puro (sem Markdown/HTML) no MVP — isso elimina a necessidade de DOMPurify. Campos de código passam apenas por limite de tamanho, pois seu destino é o sandbox |
| **CORS** | `cors({ origin: env.WEB_ORIGIN, credentials: false, methods: [...] })`. Origem exata, sem wildcard em produção |
| **Rate limiting** | `express-rate-limit`, store em memória: 120 req/min/IP nas rotas públicas, 30 req/min nas rotas `/api/admin/*`, `trust proxy` configurado para ler o IP real vindo do Caddy |
| **Headers** | `helmet()` com `contentSecurityPolicy` customizado e `crossOriginEmbedderPolicy: false` (necessário para iframes de preview) |
| **HTTPS** | Obrigatório em produção. Caddy emite e renova o certificado Let's Encrypt automaticamente; redirect 301 de HTTP→HTTPS; HSTS com `max-age=31536000` |
| **Secrets** | Nunca no repositório. Dev: `.env` (gitignored) a partir de `.env.example`. CI: GitHub Secrets. Produção: **AWS SSM Parameter Store (SecureString)**, lido no boot do container. Rotação sem redeploy de imagem |
| **Env vars** | Validadas com Zod no boot (`config/env.ts`); a aplicação **falha ao iniciar** se faltar variável — melhor do que descobrir em produção com um `undefined` silencioso |
| **Banco** | RDS em subnet privada, sem IP público; security group liberando 5432 apenas para o SG da EC2; `sslmode=require` na connection string |
| **Logs** | Pino com redaction de `authorization`, `cookie` e `password`; sem log de body em rotas autenticadas |
| **Dependências** | `pnpm audit` no CI; Dependabot semanal |
| **Erros** | `error-handler` genérico: mensagens de domínio para o cliente, stack trace só no log e no Sentry. Nunca vazar detalhes do Prisma |

**O que deliberadamente não entra:** WAF, Shield Advanced, 2FA obrigatório para admin (o Clerk já oferece com um clique se desejado), rotação automática de secrets, criptografia em nível de aplicação. Nenhum desses corresponde ao perfil de risco de um catálogo público de conteúdo autoral.

---

## 14. Estratégia de Docker

### Ambiente de desenvolvimento

Objetivo declarado: `git clone` → `cp .env.example .env` → `docker compose up` → aplicação funcionando com dados de exemplo.

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
      - '5432:5432'          # exposto para GUIs (TablePlus, DBeaver)
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

volumes:
  pgdata:
```

Pontos que fazem esse compose "simplesmente funcionar":

- `healthcheck` no Postgres + `condition: service_healthy` elimina o clássico erro de conexão na primeira subida.
- Migrations e seed rodam automaticamente no start da API — sem passo manual documentado que alguém vai esquecer.
- Volumes anônimos (`/app/node_modules`) impedem que o `node_modules` do host (possivelmente com binários de outra plataforma) sobrescreva o do container.
- Duas URLs de API: `NEXT_PUBLIC_API_URL` para o browser (localhost) e `INTERNAL_API_URL` para o servidor do Next (rede do Docker). Confundir as duas é a causa número um de "funciona no client mas quebra no SSR".

### Dockerfiles multi-stage

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

FROM deps AS build
COPY . .
RUN pnpm --filter @uilib/api prisma generate \
 && pnpm --filter @uilib/shared build \
 && pnpm --filter @uilib/api build \
 && pnpm prune --prod

FROM base AS prod
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
COPY --from=build /app/apps/api/package.json ./apps/api/
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s \
  CMD wget -qO- http://localhost:4000/api/health || exit 1
CMD ["node", "apps/api/dist/server.js"]
```

```dockerfile
# apps/web/Dockerfile  (usa output: 'standalone' no next.config.ts)
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

FROM deps AS build
COPY . .
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
RUN pnpm --filter @uilib/shared build && pnpm --filter @uilib/web build

FROM base AS prod
ENV NODE_ENV=production
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /app/apps/web/public ./apps/web/public
USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
```

`output: 'standalone'` reduz a imagem final do Next de ~1,2 GB para ~180 MB, o que importa diretamente no tempo de `docker pull` durante o deploy em uma EC2 pequena.

### Comandos do dia a dia

```bash
pnpm dev                 # sobe tudo via docker compose
pnpm db:migrate          # prisma migrate dev
pnpm db:studio           # prisma studio
pnpm db:reset            # reset + seed
pnpm test                # unit + integration
pnpm lint && pnpm typecheck
```

---

## 15. Arquitetura AWS

### Comparação de opções de compute

| Opção | Custo/mês (est.) | Facilidade de deploy | Manutenção | Crescimento |
|---|---|---|---|---|
| **A. EC2 única + Docker Compose** | ~US$ 12 (t4g.small) | Média (script SSH/SSM) | Você cuida do SO e dos patches | Vertical fácil; horizontal exige refazer |
| **B. ECS Fargate (2 serviços)** | ~US$ 35–50 + ALB US$ 18 | Alta, após setup complexo | Baixa (sem servidor) | Excelente |
| **C. AWS App Runner** | ~US$ 45–70 | Muito alta | Muito baixa | Boa, mas com pouco controle |
| **D. Elastic Beanstalk** | Custo da EC2 + ALB | Alta | Média | Boa, porém a plataforma está estagnada |

**Escolha: A — EC2 única com Docker Compose.**

Justificativa por critério, na ordem de prioridade que você definiu:

1. **Baixo custo:** ~1/3 do Fargate, e sem os ~US$ 18/mês do ALB, que sozinho custaria mais que o servidor inteiro.
2. **Facilidade de deploy:** com GitHub Actions + SSM Send Command, o deploy é `docker compose pull && up -d` — sem SSH key no CI, sem bastion.
3. **Manutenção:** Amazon Linux 2023 com atualizações automáticas de segurança e Caddy renovando TLS sozinho. A carga real de manutenção é próxima de zero para um único host.
4. **Crescimento:** o caminho de migração é curto justamente porque tudo já está containerizado. As mesmas imagens rodam no Fargate; muda a orquestração, não a aplicação. O gatilho para migrar é claro: quando um único host deixar de aguentar o tráfego ou quando downtime de deploy passar a ser inaceitável.

### Arquitetura recomendada

```
                    Route 53 (zona hospedada)
                            │
                     A record → EIP
                            │
              ┌─────────────▼──────────────────────────┐
              │ VPC (padrão ou custom /16)             │
              │                                        │
              │  Subnet pública                        │
              │  ┌──────────────────────────────────┐  │
              │  │ EC2 t4g.small (ARM64)            │  │
              │  │ Amazon Linux 2023 + Docker       │  │
              │  │ ┌──────────────────────────────┐ │  │
              │  │ │ caddy  :80 :443              │ │  │
              │  │ │  ├─ /      → web:3000        │ │  │
              │  │ │  └─ /api/* → api:4000        │ │  │
              │  │ ├──────────────────────────────┤ │  │
              │  │ │ web (Next.js standalone)     │ │  │
              │  │ │ api (Express)                │ │  │
              │  │ └──────────────────────────────┘ │  │
              │  │ EBS gp3 30 GB                    │  │
              │  └────────────────┬─────────────────┘  │
              │                   │ 5432 (SG → SG)     │
              │  Subnets privadas │                    │
              │  ┌────────────────▼─────────────────┐  │
              │  │ RDS PostgreSQL 16                │  │
              │  │ db.t4g.micro, 20 GB gp3          │  │
              │  │ Single-AZ, backup 7 dias, PITR   │  │
              │  └──────────────────────────────────┘  │
              └────────────────────────────────────────┘

        SSM Parameter Store (secrets)   CloudWatch (logs/alarmes)
                    ▲                            ▲
                    └──── IAM Role da EC2 ───────┘
```

### Componentes

| Recurso | Configuração | Motivo |
|---|---|---|
| **EC2** | t4g.small (2 vCPU ARM, 2 GB RAM), Amazon Linux 2023, EBS gp3 30 GB, Elastic IP | Graviton entrega ~20% mais desempenho por dólar. 2 GB comportam Next + Express com folga |
| **RDS** | PostgreSQL 16, db.t4g.micro, 20 GB gp3, Single-AZ, backup 7 dias, minor upgrades automáticos | Backup automático e PITR são o principal motivo de não rodar Postgres no mesmo container. Multi-AZ dobraria o custo sem necessidade no MVP |
| **Route 53** | Zona hospedada + A record para o EIP | US$ 0,50/mês |
| **TLS** | Caddy + Let's Encrypt | Gratuito e automático. **ACM não é usado** porque exigiria ALB ou CloudFront — custo que não se justifica agora |
| **SSM Parameter Store** | SecureStrings para `DATABASE_URL`, `CLERK_SECRET_KEY`, `REVALIDATE_SECRET` | Grátis no tier standard; muito mais simples que Secrets Manager (US$ 0,40/segredo/mês) |
| **CloudWatch** | Logs dos containers via driver `awslogs`; alarmes de CPU > 80%, RAM, e status check | Free tier cobre o volume; sem alarme, indisponibilidade só é notada por reclamação |
| **IAM** | Instance profile com permissão mínima: ler SSM, escrever logs, ler GHCR via secret | Sem chaves de acesso estáticas na máquina |
| **S3** | **Não usado no MVP** | Não há upload de arquivos (ver 6.6) |
| **CloudFront** | **Não usado no MVP** | O ISR do Next já entrega HTML cacheado; a CDN vira relevante com tráfego internacional ou custo de banda significativo |

### Estimativa de custo mensal (região us-east-1)

| Item | Custo |
|---|---|
| EC2 t4g.small (on-demand) | US$ 12,26 |
| EBS gp3 30 GB | US$ 2,40 |
| RDS db.t4g.micro | US$ 12,41 |
| RDS storage 20 GB + backup | US$ 2,80 |
| Elastic IP (em uso) | US$ 3,60 |
| Route 53 hosted zone | US$ 0,50 |
| Transferência de dados (~50 GB) | ~US$ 4,50 |
| **Total** | **≈ US$ 38/mês** |

**Duas alavancas de redução, se necessário:**

1. **Savings Plan de 1 ano** na EC2 e RDS: cai para ~US$ 26/mês (economia ~30%).
2. **Postgres em container na própria EC2** em vez de RDS: cai para ~US$ 23/mês, mas você assume backups (script `pg_dump` + S3 + cron) e perde PITR. **Não recomendo** — os ~US$ 15 do RDS compram tranquilidade de dados, que é a última coisa em que se deve economizar.

Se a região escolhida for `sa-east-1` (São Paulo, menor latência para usuários no Brasil), some ~30–40% ao total. Recomendo **us-east-1** para o MVP: mais barato, e a latência extra é irrelevante para páginas servidas do cache ISR.

---

## 16. Estratégia de deploy

### Provisionamento inicial (uma vez, manual e documentado em `infra/README.md`)

1. Criar VPC (ou usar a default), 1 subnet pública + 2 privadas.
2. Security Groups:
   - `sg-web`: entrada 80/443 de `0.0.0.0/0`; SSH **fechado** (acesso só por SSM Session Manager).
   - `sg-db`: entrada 5432 apenas de `sg-web`.
3. RDS PostgreSQL em subnet group privado, sem acesso público.
4. EC2 com instance profile IAM (SSM + CloudWatch), user-data instalando Docker, Compose plugin e o agente SSM.
5. Parâmetros no SSM Parameter Store.
6. Elastic IP associado; registro A no Route 53.
7. `docker-compose.prod.yml` e `Caddyfile` copiados para `/opt/uilib`.

Não uso Terraform/CDK no MVP: são ~7 recursos criados uma única vez. Introduzir IaC só se justifica quando houver múltiplos ambientes (staging + prod) — e nesse momento vale fazê-lo direito.

### `Caddyfile`

```caddy
seudominio.com, www.seudominio.com {
    encode zstd gzip

    handle_path /api/* {
        reverse_proxy api:4000
    }

    handle {
        reverse_proxy web:3000
    }

    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
        X-Content-Type-Options "nosniff"
        Referrer-Policy "strict-origin-when-cross-origin"
        -Server
    }
}
```

### `docker-compose.prod.yml`

```yaml
services:
  caddy:
    image: caddy:2-alpine
    restart: always
    ports: ['80:80', '443:443']
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    depends_on: [web, api]

  api:
    image: ghcr.io/SEU_USER/uilib-api:${TAG:-latest}
    restart: always
    env_file: /opt/uilib/.env
    expose: ['4000']
    healthcheck:
      test: ['CMD', 'wget', '-qO-', 'http://localhost:4000/api/health']
      interval: 30s
      retries: 3
    logging:
      driver: awslogs
      options:
        awslogs-group: /uilib/api
        awslogs-region: us-east-1

  web:
    image: ghcr.io/SEU_USER/uilib-web:${TAG:-latest}
    restart: always
    env_file: /opt/uilib/.env
    expose: ['3000']
    depends_on:
      api:
        condition: service_healthy

volumes:
  caddy_data:
  caddy_config:
```

### Fluxo de deploy

```
push na main
  → CI: lint, typecheck, testes
  → build das imagens (linux/arm64) e push para GHCR com tag = SHA do commit
  → aws ssm send-command na instância:
        cd /opt/uilib
        echo TAG=<sha> > .env.tag
        docker compose pull
        docker compose run --rm api pnpm prisma migrate deploy
        docker compose up -d
        docker image prune -f
  → smoke test: GET https://seudominio.com/api/health
  → se falhar: TAG=<sha anterior> && docker compose up -d   (rollback)
```

**Migrations:** sempre `prisma migrate deploy` (nunca `dev`) e sempre **antes** de subir os containers novos. Regra de disciplina: migrations devem ser retrocompatíveis com a versão anterior da aplicação (adicionar coluna nullable, depois popular, depois tornar obrigatória em um segundo deploy). Isso torna rollback seguro.

**Downtime:** o `docker compose up -d` reinicia os containers, causando poucos segundos de indisponibilidade. Para um MVP, é aceitável. Se deixar de ser, o próximo passo é rodar duas réplicas por serviço com Caddy balanceando — sem trocar de infraestrutura.

**Rollback:** trocar `TAG` para o SHA anterior e subir. Como as imagens ficam no GHCR, o rollback é imediato. Migrations não são revertidas automaticamente — daí a regra de retrocompatibilidade acima.

---

## 17. Variáveis de ambiente

### `.env.example` (raiz — usado por todos os serviços em dev)

```bash
# ───── Banco de dados ─────
DATABASE_URL="postgresql://uilib:uilib@db:5432/uilib?schema=public"

# ───── API ─────
NODE_ENV="development"
PORT="4000"
WEB_ORIGIN="http://localhost:3000"          # usado por CORS e authorizedParties
LOG_LEVEL="debug"

# ───── Clerk ─────
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/admin"

# ───── Web ─────
NEXT_PUBLIC_API_URL="http://localhost:4000"   # usado pelo browser
INTERNAL_API_URL="http://api:4000"            # usado pelo servidor do Next
NEXT_PUBLIC_SITE_URL="http://localhost:3000"  # canonical, OG, sitemap

# ───── Revalidação de cache (compartilhado entre api e web) ─────
REVALIDATE_SECRET="troque-por-um-valor-aleatorio-longo"

# ───── Observabilidade (opcional em dev) ─────
SENTRY_DSN=""
```

### Tabela de referência

| Variável | Serviço | Obrigatória | Produção |
|---|---|---|---|
| `DATABASE_URL` | api | Sim | SSM SecureString, com `?sslmode=require` |
| `NODE_ENV` | api, web | Sim | `production` |
| `PORT` | api | Não (default 4000) | `4000` |
| `WEB_ORIGIN` | api | Sim | `https://seudominio.com` |
| `LOG_LEVEL` | api | Não | `info` |
| `CLERK_SECRET_KEY` | api, web | Sim | SSM SecureString, chave `sk_live_` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | web | Sim | Build-time arg, chave `pk_live_` |
| `NEXT_PUBLIC_API_URL` | web (browser) | Sim | `https://seudominio.com` |
| `INTERNAL_API_URL` | web (server) | Sim | `http://api:4000` |
| `NEXT_PUBLIC_SITE_URL` | web | Sim | `https://seudominio.com` |
| `REVALIDATE_SECRET` | api, web | Sim | SSM SecureString |
| `SENTRY_DSN` | api, web | Não | Recomendada |

**Validação no boot** (`config/env.ts`), tanto na API quanto no web:

```ts
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  DATABASE_URL: z.string().url(),
  WEB_ORIGIN: z.string().url(),
  CLERK_SECRET_KEY: z.string().min(1),
  REVALIDATE_SECRET: z.string().min(32),
  PORT: z.coerce.number().default(4000),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export const env = envSchema.parse(process.env); // lança e derruba o processo se inválido
```

Variáveis `NEXT_PUBLIC_*` são **embutidas no bundle do cliente em build time** — nunca coloque segredo nelas.

---

## 18. Estratégia de testes

Filosofia para MVP: **poucos testes, nos lugares certos**. O alvo não é cobertura alta, é evitar regressão nos caminhos que quebrariam o produto de forma perceptível.

### Pirâmide adotada

```
        ╱╲     E2E (Playwright) — 4 a 6 cenários
       ╱──╲
      ╱────╲   Integração de API (Vitest + Supertest) — o grosso do esforço
     ╱──────╲
    ╱────────╲ Unitários (Vitest) — services puros
```

**Onde está o peso e por quê:** em um CRUD, quase todos os bugs reais aparecem na fronteira HTTP ↔ validação ↔ banco. Testar o service isoladamente com Prisma mockado testa o mock, não o sistema. Por isso o investimento principal vai em testes de integração que sobem o Express de verdade contra um Postgres de verdade.

### Camadas

| Camada | Ferramenta | Cobre | Exemplos |
|---|---|---|---|
| **Unitário** | Vitest | Lógica pura, sem I/O | `slugify` com acentos e caracteres especiais; `renderPrompt` substituindo variáveis e omitindo o bloco JS quando nulo; transição de `status` definindo `publishedAt` |
| **Integração (API)** | Vitest + Supertest + Postgres em Docker | Rotas completas com banco real | `GET /components` filtrando DRAFT; paginação; busca por `q`; 409 em slug duplicado; 409 ao apagar categoria em uso; 401/403 nas rotas admin |
| **Componente (web)** | Vitest + Testing Library | Componentes com lógica | `CopyPromptButton` chamando o clipboard e exibindo toast; `SearchBar` com debounce atualizando a URL; `CodeTabs` escondendo a aba JS quando vazia |
| **E2E** | Playwright | Fluxos críticos ponta a ponta | (1) home carrega e mostra cards; (2) busca filtra resultados; (3) detalhe renderiza preview e copia código; (4) copiar prompt; (5) login admin → criar componente → aparece publicado |

### Banco de testes

Um segundo serviço Postgres na porta 5433 (`docker-compose.test.yml`), com `DATABASE_URL` própria. Antes da suíte: `prisma migrate deploy`. Entre testes: `TRUNCATE ... RESTART IDENTITY CASCADE` nas tabelas — mais rápido e mais previsível do que recriar o schema. Testcontainers seria mais elegante, mas adiciona dependência e tempo de subida sem ganho relevante aqui.

### Metas

- **Não perseguir % de cobertura.** Perseguir: toda rota da API com pelo menos um teste de caminho feliz e um de erro.
- Testes rodam no CI em todo push e PR; PR não faz merge com suíte vermelha.
- Tempo total da suíte: manter abaixo de 3 minutos. Acima disso, as pessoas param de rodar localmente.

---

## 19. Estratégia de CI/CD

### `ci.yml` — todo push e PR

```yaml
name: CI
on:
  push: { branches: [main] }
  pull_request:

jobs:
  quality:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test
        ports: ['5432:5432']
        options: >-
          --health-cmd pg_isready --health-interval 5s
          --health-timeout 5s --health-retries 10
    env:
      DATABASE_URL: postgresql://test:test@localhost:5432/test
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm --filter @uilib/api prisma migrate deploy
      - run: pnpm test
      - run: pnpm audit --audit-level=high || true
```

### `deploy.yml` — só na `main`, após o CI passar

```yaml
name: Deploy
on:
  workflow_run:
    workflows: [CI]
    types: [completed]
    branches: [main]

jobs:
  deploy:
    if: github.event.workflow_run.conclusion == 'success'
    runs-on: ubuntu-latest
    permissions: { contents: read, packages: write, id-token: write }
    steps:
      - uses: actions/checkout@v4

      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build & push API
        uses: docker/build-push-action@v6
        with:
          context: .
          file: apps/api/Dockerfile
          target: prod
          platforms: linux/arm64
          push: true
          tags: ghcr.io/${{ github.repository_owner }}/uilib-api:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Build & push Web
        uses: docker/build-push-action@v6
        with:
          context: .
          file: apps/web/Dockerfile
          target: prod
          platforms: linux/arm64
          push: true
          build-args: |
            NEXT_PUBLIC_API_URL=${{ vars.PUBLIC_API_URL }}
            NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=${{ vars.CLERK_PK }}
          tags: ghcr.io/${{ github.repository_owner }}/uilib-web:${{ github.sha }}

      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_DEPLOY_ROLE_ARN }}   # OIDC, sem chave estática
          aws-region: us-east-1

      - name: Deploy via SSM
        run: |
          aws ssm send-command \
            --instance-ids ${{ secrets.EC2_INSTANCE_ID }} \
            --document-name AWS-RunShellScript \
            --parameters 'commands=[
              "cd /opt/uilib",
              "echo TAG=${{ github.sha }} > .env.tag",
              "docker compose --env-file .env.tag pull",
              "docker compose --env-file .env.tag run --rm api pnpm prisma migrate deploy",
              "docker compose --env-file .env.tag up -d",
              "docker image prune -f"
            ]' \
            --output text

      - name: Smoke test
        run: |
          sleep 25
          curl -fsS https://seudominio.com/api/health
```

**Decisões:**

- **GHCR em vez de ECR:** sem custo adicional e sem gerenciar autenticação de registry na AWS. Se o volume de pulls crescer, migrar para ECR é trocar duas linhas.
- **OIDC em vez de chave IAM no GitHub:** elimina credencial de longa duração nos secrets do repositório.
- **SSM Send Command em vez de SSH:** dispensa abrir porta 22 e guardar chave privada no CI.
- **Tag = SHA do commit** em vez de `latest`: cada deploy é rastreável e o rollback é determinístico.
- **Um único ambiente (produção)** no MVP. Staging é a próxima adição natural, e é quando IaC passa a valer a pena.

---

## 20. Roadmap de implementação

Estimativas assumem um desenvolvedor experiente em tempo integral.

### Fase 0 — Fundação (2–3 dias)

- Monorepo pnpm, TypeScript strict, ESLint + Prettier, Husky + lint-staged.
- `packages/shared` com os primeiros schemas Zod.
- `docker-compose.yml` com Postgres subindo.
- `README.md` com o passo a passo local.
- **Entrega:** `docker compose up` sobe o banco; `pnpm lint` e `pnpm typecheck` passam.

### Fase 1 — Banco e domínio (2 dias)

- Schema Prisma completo, migration inicial, migration de trigram.
- Seed idempotente com 14 categorias e componentes de exemplo.
- Repositórios e services de `components` e `categories`.
- Testes unitários de `slugify` e regras de publicação.
- **Entrega:** banco populado, `prisma studio` navegável.

### Fase 2 — API pública (3 dias)

- Bootstrap do Express: helmet, cors, rate limit, pino, request-id, error handler.
- `GET /health`, `/categories`, `/components`, `/components/:slug`.
- Busca com trigram, filtro por categoria, paginação e ordenação.
- `prompt.service.ts` com o template global e renderização de variáveis.
- `GET /components/:slug/prompt`.
- Testes de integração dos endpoints públicos.
- **Entrega:** API pública completa e testada, consumível via HTTP.

### Fase 3 — Frontend público (4–5 dias)

- Setup Next.js, Tailwind, shadcn, layout base, tema claro/escuro.
- `SandboxPreview` (iframe + srcdoc) e `LazyPreview` (IntersectionObserver) — **o item de maior risco técnico; fazer primeiro dentro desta fase**.
- Home com grid, busca, filtro por categoria e paginação.
- Página de detalhes: preview, `CodeTabs` com Shiki, `CopyCodeButton`, `CopyPromptButton`, `StackSelector`.
- SEO: metadata, sitemap, robots, OG dinâmico.
- Responsividade e estados de loading/vazio/erro.
- **Entrega:** site público navegável ponta a ponta com dados do seed.

### Fase 4 — Autenticação e área administrativa (3–4 dias)

- Clerk configurado, `middleware.ts`, página de sign-in, `role` no `publicMetadata`.
- `requireAdmin` + `ensureLocalUser` na API; endpoints admin de componentes e categorias.
- Telas do admin: listagem, formulário com preview ao vivo, exclusão com confirmação, CRUD de categorias.
- Revalidação de cache sob demanda após mutações.
- Testes de integração de autorização (401/403).
- **Entrega:** ciclo completo de publicação funcionando localmente.

### Fase 5 — Infraestrutura e deploy (2–3 dias)

- Dockerfiles de produção multi-stage; `docker-compose.prod.yml`; `Caddyfile`.
- Provisionamento AWS: VPC, SGs, RDS, EC2, EIP, Route 53, SSM.
- `ci.yml` e `deploy.yml`; role OIDC.
- Primeiro deploy, smoke test, ensaio de rollback.
- **Entrega:** produção no ar com HTTPS e deploy automatizado.

### Fase 6 — Conteúdo, polimento e lançamento (3–5 dias)

- Cadastro dos componentes reais (a maior parte do tempo desta fase).
- Sentry, alarmes de CloudWatch, verificação de backup do RDS.
- Playwright com os 5 cenários críticos.
- Auditoria Lighthouse (metas: Performance ≥ 90, Acessibilidade ≥ 95).
- Ensaio de restore do banco a partir do snapshot — **teste o backup antes de precisar dele**.
- **Entrega:** MVP lançado.

**Total estimado: 4 a 5 semanas.**

### Ordem de risco (o que atacar cedo)

| Risco | Fase | Mitigação |
|---|---|---|
| Preview em iframe não fiel ou lento no grid | 3 | Prototipar `SandboxPreview` isolado no primeiro dia da fase |
| Payload da listagem grande demais | 2 | Medir com dados reais; ativar compressão; ajustar `limit` |
| Qualidade do prompt de IA abaixo do esperado | 2 | Testar o prompt gerado em 3 agentes diferentes antes de fechar o template |
| Deploy via SSM com detalhes de permissão IAM | 5 | Validar o `send-command` manualmente antes de automatizar |

---

## 21. Fora do escopo do MVP

Confirmando as exclusões definidas, com o motivo de cada uma:

| Item | Por que fica de fora |
|---|---|
| Marketplace, pagamentos, assinaturas | Exige modelo de monetização validado, compliance fiscal e gateway. Nada disso se testa sem tráfego |
| Integração direta com OpenAI/Claude/Gemini | O prompt copiável entrega o mesmo valor com custo zero e sem chaves de API |
| Editor visual drag-and-drop | Produto inteiro à parte; multiplicaria o escopo do MVP |
| Geração automática de componentes por IA | Depende de um catálogo curado existir primeiro |
| Sistema social, comentários, likes | Precisa de autenticação pública, moderação e antispam — nada disso é necessário para validar a proposta |
| Sistema complexo de usuários (papéis, times) | Há um administrador |
| Analytics avançado | Plausible ou GA4 cobrem o essencial depois; produto de analytics próprio é distração |
| Microsserviços | Uma aplicação de 13 endpoints não tem domínios independentes a separar |
| Colaboração em tempo real | Sem múltiplos autores, não há o que colaborar |
| `ComponentVersion` | Sem consumidores externos travados em versão, não há caso de uso (ver Seção 9) |
| Upload de imagens / S3 | Previews são código renderizado; OG é gerado dinamicamente |
| CDN (CloudFront) | O ISR já cacheia HTML; custo e complexidade sem ganho no volume inicial |
| Redis / filas | Não há trabalho assíncrono nem estado compartilhado entre instâncias |
| Multi-AZ, auto scaling, ALB | Dobrariam o custo para uma disponibilidade que o MVP não exige |
| Terraform / CDK | Sete recursos criados uma vez; IaC entra junto com o ambiente de staging |
| i18n | Interface em inglês, público desenvolvedor |

---

## 22. Possíveis evoluções futuras

Ordenadas por relação valor/esforço, considerando a arquitetura escolhida.

### Curto prazo (pós-lançamento imediato)

1. **Analytics de uso** — Plausible ou PostHog: quais componentes são mais vistos, e principalmente **quantos "Copy AI Prompt" acontecem**. Esta é a métrica que valida a tese do produto inteiro. Uma tabela `component_events` no próprio Postgres já resolve.
2. **Favoritos locais** — `localStorage`, sem backend, sem login.
3. **Página `/prompt-guide`** — explicar como usar o prompt em cada agente. Aumenta a taxa de sucesso de quem copia e cola, que é a conversão real do produto.
4. **Componentes relacionados** na página de detalhes — mesma categoria, query trivial.

### Médio prazo

5. **Registry compatível com shadcn** (`/r/[slug].json`) — permite `npx shadcn@latest add https://seudominio.com/r/neon-toggle`. Instalação em um comando; alto valor percebido, esforço moderado. **É aqui que `ComponentVersion` finalmente se justifica.**
6. **Servidor MCP** — expõe busca e leitura do catálogo como ferramentas para agentes de IA. O agente encontra o componente sozinho, sem copy-paste humano. Consome os endpoints que já existem.
7. **Busca semântica com pgvector** — "quero um botão que pareça vidro" encontra o componente de glassmorphism mesmo sem a palavra no texto. Extensão do próprio Postgres, sem novo serviço.
8. **Filtro por tecnologia** — momento de normalizar `technologies` em tabela.
9. **Contas de usuário públicas** com coleções salvas.
10. **Staging + IaC (Terraform)** — quando um deploy quebrado deixar de ser tolerável.

### Longo prazo

11. **Componentes enviados pela comunidade**, com moderação — muda o perfil de risco: o sandbox do preview deixa de ser defesa em profundidade e passa a ser controle crítico, exigindo também CSP mais rígida e revisão obrigatória.
12. **Variantes por framework** salvas no banco (React/Vue/Svelte prontos), reduzindo a dependência do prompt.
13. **CLI própria** (`npx uilib add <slug>`) com detecção automática da stack do projeto.
14. **Playground editável** — o usuário ajusta cores e tamanhos antes de copiar, e o prompt sai já personalizado.
15. **Migração para ECS Fargate** — quando houver necessidade real de zero-downtime e escala horizontal.

### Gatilhos objetivos para revisitar a arquitetura

| Sinal | Ação |
|---|---|
| Busca `ILIKE` acima de 200 ms | Migrar para `tsvector` com coluna gerada |
| CPU da EC2 sustentada acima de 70% | Subir para t4g.medium (vertical primeiro) |
| Downtime de deploy vira problema | Duas réplicas atrás do Caddy, depois ECS |
| Banda mensal acima de ~200 GB | Colocar CloudFront na frente |
| Segundo autor entra no projeto | Papéis, workflow de revisão e auditoria |
| Consumidores externos (CLI/MCP) em produção | `ComponentVersion` + versionamento da API (`/v1`) |

---

## Apêndice A — Glossário de decisões

Resumo das escolhas não óbvias e do critério que as sustenta.

| # | Decisão | Alternativa rejeitada | Critério decisivo |
|---|---|---|---|
| D1 | Express separado do Next.js | Tudo em Route Handlers | API reutilizável por CLI/MCP no futuro |
| D2 | Monorepo pnpm com `packages/shared` | Dois repositórios | Schemas Zod como fonte única de verdade |
| D3 | `html`/`css`/`js` em colunas separadas | Campo `code` genérico | Preview e código-fonte não podem divergir |
| D4 | Preview em iframe sandbox | `dangerouslySetInnerHTML` | Isolamento de CSS e contenção de JS |
| D5 | Sem `ComponentVersion` | Versionamento desde o início | Nenhum consumidor travado em versão; PITR cobre erro humano |
| D6 | `technologies` como `String[]` | Tabela + N:N | MVP não filtra por tecnologia |
| D7 | Busca com trigram | `tsvector` ou motor externo | Instantâneo até milhares de registros, custo zero |
| D8 | EC2 única + Compose | ECS Fargate | ~US$ 30/mês de diferença; migração já preparada |
| D9 | Caddy + Let's Encrypt | ACM + ALB | ALB custaria mais que o servidor |
| D10 | Prompt por template renderizado | Texto fixo por componente | Melhorar o prompt uma vez vale para todo o catálogo |
| D11 | GHCR + SSM | ECR + SSH | Sem custo de registry, sem chave privada no CI |
| D12 | Sem S3/CloudFront | Upload de thumbnails | Preview é código; OG é gerado em runtime |
| D13 | Clerk | Auth.js / JWT próprio | Um admin não justifica construir autenticação |
| D14 | Peso dos testes na integração | Unitários com Prisma mockado | Em CRUD, os bugs vivem na fronteira HTTP/banco |

---

*Documento preparado para servir como base direta de implementação. Cada seção contém decisões justificadas e alternativas descartadas, de modo que qualquer desvio futuro possa ser avaliado contra o critério original.*
