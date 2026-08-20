# apps/e2e

Testes end-to-end (Playwright) do MVP2 — ver `docs/MVP2.md`, seções 14/15
(não versionado; ver README raiz para o resumo do produto). Roda contra
uma instância real do stack (`web` + `api` + banco), nunca contra mocks de
rede: os 5 cenários obrigatórios da etapa validam o caminho completo
browser → Next.js → API → Postgres.

## Pré-requisitos

O stack precisa já estar no ar antes de rodar os testes — este pacote não
sobe/derruba `web`/`api`/`db` sozinho (ver `playwright.config.ts` para o
porquê):

```bash
docker compose up -d          # na raiz do monorepo
```

Instale o navegador do Playwright (uma vez, ou sempre que a versão em
`package.json` mudar):

```bash
pnpm --filter @uilib/e2e exec playwright install chromium
# Se o ambiente permitir sudo, prefira `--with-deps` para instalar também
# as bibliotecas de sistema do Chromium.
```

## Rodando

```bash
pnpm test:e2e                              # na raiz — atalho para o comando abaixo
pnpm --filter @uilib/e2e run test:e2e      # equivalente, direto no workspace
pnpm --filter @uilib/e2e run test:e2e:ui   # modo interativo (UI do Playwright)
pnpm --filter @uilib/e2e run test:e2e:report  # abre o último relatório HTML
```

`E2E_BASE_URL` (default `http://localhost:3000`) aponta os testes a outro
ambiente, se necessário.

## Cenário 5 (login administrativo) — requer um usuário Clerk real

Não existe (nem deveria existir) forma de "logar como admin" sem passar
pelo Clerk de verdade — inventar um atalho de autenticação só para teste
comprometeria justamente o que a seção 9 do MVP2 protege. Por isso
`tests/admin-publish.spec.ts` só roda com um usuário real de uma
**instância de teste** do Clerk, com `publicMetadata.role = "admin"`:

```bash
export E2E_ADMIN_EMAIL="seu-usuario-admin@teste.com"
export E2E_ADMIN_PASSWORD="a senha desse usuário"
pnpm test:e2e
```

Sem essas variáveis, o teste é **pulado** com um motivo explícito no
relatório (`1 skipped`) — nunca mascarado como aprovado. O teste cria um
componente (`E2E Test Component <timestamp>`, já `PUBLISHED`), confirma
que ele aparece em `/component/<slug>` depois da revalidação, e apaga o
próprio componente ao final (não deixa dado de teste na base).

**Nunca** commite `E2E_ADMIN_EMAIL`/`E2E_ADMIN_PASSWORD` em nenhum arquivo
do repositório — exporte-as no shell ou num `.env` local ignorado pelo Git
(ex.: `.env.e2e.local`, carregado manualmente antes de rodar).

## Estrutura

```
tests/
├── home.spec.ts              # cenário 1 — home carrega e mostra cards
├── search.spec.ts            # cenário 2 — busca filtra resultados
├── component-detail.spec.ts  # cenário 3 — preview sandboxed + copy code
├── copy-prompt.spec.ts       # cenário 4 — copy AI prompt
└── admin-publish.spec.ts     # cenário 5 — login admin → criar → aparece publicado
```

## Notas de ambiente

- Este pacote roda em qualquer máquina com Docker + Node — não depende de
  bibliotecas de sistema além das que o Chromium do Playwright já resolve
  sozinho na maioria das distros. Em ambientes sem acesso a `sudo` (sem
  `apt`/`--with-deps`), o Chromium ainda funciona; se a suíte travar ao
  abrir uma página real (não em `page.setContent`), tente rodar com
  `launchOptions: { args: ['--no-sandbox'] }` (já configurado neste
  `playwright.config.ts`) — o sandbox interno do Chromium exige
  `CAP_SYS_ADMIN`/namespaces de usuário que containers/sandboxes restritos
  costumam não conceder.
