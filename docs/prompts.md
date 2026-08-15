# Prompts para implementar o MVP1

Use os prompts abaixo **na ordem** e no mesmo repositório. Cada prompt pressupõe
que o anterior foi concluído e validado. Eles se limitam estritamente ao escopo
de [`MVP1.md`](./MVP1.md): nesta etapa não crie frontend, Next.js, Clerk,
Redis, CI/CD, infraestrutura AWS, versionamento de componentes ou chamadas a
LLM.

## Regra permanente para todos os prompts

Inclua este bloco no início de cada solicitação ao agente de IA:

```text
Você está implementando exclusivamente o MVP1 descrito em docs/MVP1.md deste
repositório. Leia o arquivo antes de editar qualquer coisa e considere-o a
fonte única de verdade. Não use requisitos de outros documentos nem invente
funcionalidades.

Trabalhe em TypeScript ponta a ponta e aplique Clean Code e SOLID: módulos com
uma responsabilidade clara, controllers finos, regras de negócio em services,
acesso a dados isolado em repositories, dependências explícitas e tratamento
de erros consistente. Priorize a solução mais simples que atende ao MVP; não
introduza abstrações, dependências ou infraestrutura não solicitadas.

Comente o código em português. Use JSDoc em funções/classes públicas e
comentários curtos para decisões não óbvias, regras de negócio, segurança e
limites impostos pelo MVP. Não adicione comentários que apenas repitam código
evidente. Preserve alterações existentes que não pertençam a esta tarefa.

Antes de encerrar: execute os comandos de validação relevantes, corrija os
erros causados pelo seu trabalho e informe arquivos alterados, comandos
executados e qualquer impedimento real. Não implemente itens de MVP2 ou Final.
```

---

## [done] 1. Estruturar o monorepo e as ferramentas

```text
Partindo das regras permanentes, implemente apenas a fundação do monorepo do
MVP1.

1. Configure pnpm 9 com workspaces para apps/* e packages/*, sem Turborepo ou
   Nx.
2. Crie apps/api e packages/shared com package.jsons coerentes, TypeScript e
   scripts de desenvolvimento, build, lint, typecheck, testes e Prisma.
3. Crie apps/web somente como placeholder documentado; não instale nem
   configure Next.js ou qualquer dependência de frontend.
4. Instale somente as dependências de backend previstas no MVP1: Express 5,
   Prisma 6, Zod, Pino/pino-http, helmet, cors, express-rate-limit, Vitest e
   Supertest, além das dependências de tipos e ferramentas indispensáveis.
5. Crie tsconfig(s), configuração de lint e .gitignore adequados ao monorepo.
6. Crie .env.example com exatamente DATABASE_URL, NODE_ENV, PORT, WEB_ORIGIN,
   LOG_LEVEL e DEV_ADMIN_TOKEN, usando os valores exemplificados no MVP1.
7. Escreva um README inicial que explique somente como instalar, configurar o
   ambiente e executar API/testes neste MVP.

Não implemente rotas, banco, Docker ou autenticação nesta etapa. Ao final,
valide que pnpm install, pnpm lint e pnpm typecheck estão utilizáveis.
```

## [done] 2. Compartilhar contratos de validação

```text
Partindo das regras permanentes, implemente o pacote packages/shared conforme
MVP1.

Crie schemas Zod e tipos exportados em schemas/component.ts,
schemas/category.ts, schemas/pagination.ts, types.ts e index.ts. Cubra todos
os parâmetros de query e corpos definidos no documento:

- componente de criação e atualização parcial;
- categoria de criação e atualização parcial;
- paginação pública (q, category, page, limit e sort);
- parâmetros do endpoint de prompt (framework e styling).

Respeite todos os limites e enums do MVP1: slug com a regex definida, strings,
arrays, deduplicação de technologies, defaults e limites máximos. A atualização
de componente deve aceitar apenas ao menos um campo válido, sem tornar os
campos de criação obrigatórios. Não faça validações que dependem do banco no
schema; elas pertencem ao service. Exporte tipos inferidos pelos schemas.

Crie testes unitários focados nas bordas mais relevantes dos schemas. Não crie
DTOs ou campos que não aparecem em MVP1. Execute lint, typecheck e os testes
do pacote.
```

## [done] 3. Modelar banco, migrations e seed

```text
Partindo das regras permanentes, implemente a camada Prisma em apps/api.

1. Crie schema.prisma exatamente com User, Category e Component, os enums Role
   e ComponentStatus, relações, defaults, nomes de tabela, onDelete e índices
   especificados no MVP1.
2. Crie a migration inicial e uma migration SQL adicional que habilita pg_trgm
   e cria os dois índices GIN para name e description com gin_trgm_ops.
3. Configure o Prisma Client em lib/prisma.ts de modo seguro para o ciclo de
   vida da aplicação.
4. Crie prisma/seed.ts idempotente por slug. Insira as 14 categorias na ordem
   exata do MVP1 e de dois a três componentes de exemplo por categoria, com
   dados válidos e publicados quando precisarem estar disponíveis para a API
   pública. Não inclua conteúdo de frontend.
5. Configure o comando de seed no Prisma.

Não implemente rotas ainda. Valide geração do Prisma, aplicação das migrations
e seed contra o banco de desenvolvimento se ele estiver disponível; se não
estiver, valide estaticamente e deixe explícito o comando que depende do banco.
```

## [done] 4. Configuração, observabilidade e ciclo de vida da API

```text
Partindo das regras permanentes, construa a infraestrutura transversal da API
Express em apps/api/src, sem criar rotas de domínio ainda.

Implemente:
- config/env.ts com validação Zod no boot para as seis variáveis do MVP1,
  incluindo DEV_ADMIN_TOKEN;
- lib/logger.ts com Pino e redaction de authorization, cookie e password;
- lib/errors.ts com AppError e erros de domínio necessários (validação,
  não encontrado, conflito, não autorizado e proibido);
- middlewares request-id, validate e error-handler, mantendo o envelope de
  erro padronizado do MVP1 e nunca expondo stack trace ao cliente;
- middlewares de rate limit: 120 req/min/IP no público e 30 req/min/IP em
  /api/admin/*;
- app.ts com express.json({ limit: '1mb' }), helmet, cors com origem exata
  env.WEB_ORIGIN, pino-http, request-id, routers e error handler;
- server.ts com bootstrap e graceful shutdown do servidor e Prisma;
- routes.ts como agregador inicialmente preparado para os módulos;
- lib/revalidate.ts apenas como placeholder documentado para MVP2.

Defina tipos Express necessários para request-id e autenticação futura sem usar
any indiscriminadamente. Não configure CORS wildcard, credenciais, Clerk ou
logs de segredos. Teste unitariamente os comportamentos que não requerem banco
e execute lint/typecheck.
```

## [done] 5. Criar o módulo público de categorias e health check

```text
Partindo das regras permanentes, implemente GET /api/health e GET
/api/categories.

O health check deve executar SELECT 1 via Prisma e retornar HTTP 200 com
{ "status": "ok", "uptime": number, "db": "ok" }. Falhas de banco devem
seguir o error-handler, sem mascarar a indisponibilidade.

GET /api/categories deve retornar o envelope { data: [...] } contendo apenas
id, name, slug, description, position e componentCount. Ordene por position e
conte somente componentes PUBLISHED usando a capacidade de _count filtrado do
Prisma. Separe routes, controller, service, repository e mapper do módulo de
categorias segundo a estrutura do MVP1; não exponha entidades Prisma
diretamente.

Adicione testes de integração de sucesso e erro para ambas as rotas. Não crie
endpoints administrativos de categorias ainda.
```

## [done] 6. Criar os endpoints públicos de componentes

```text
Partindo das regras permanentes, implemente o módulo components para as rotas
públicas GET /api/components e GET /api/components/:slug.

Para a listagem, valide q, category, page, limit e sort com os schemas
compartilhados. Retorne somente PUBLISHED, filtre por category slug e responda
404 quando ela não existir. Pesquise q com ILIKE em name ou description,
ordene por createdAt desc para recent ou por name para name e retorne a meta de
paginação definida. O DTO da lista deve conter somente os campos exibidos no
MVP1, com category e preview { html, css, js }.

Para o detalhe, busque apenas componentes PUBLISHED. Aceite preview=1 somente
quando existir autenticação administrativa válida segundo o middleware
provisório; sem ela, nunca revele DRAFT. O detalhe deve incluir html, css, js,
category e prompt renderizado para React + Tailwind CSS. Não inclua campos
internos como authorId ou promptTemplate na resposta pública.

Implemente mapper, repository, service, controller e routes com dependências
claras. Escreva testes de integração para DRAFT oculto, paginação, busca,
categoria inexistente, slug inexistente e visualização de draft autorizada.
```

## [done] 7. Implementar o template e endpoint de prompt

```text
Partindo das regras permanentes, implemente modules/prompts/default-template.ts
e prompt.service.ts, depois conecte GET /api/components/:slug/prompt.

Implemente a renderização do template global exatamente com as variáveis e os
requisitos fornecidos na seção 8 de MVP1. Suporte template específico do
componente quando promptTemplate não for nulo. Substitua
{{name}}, {{category}}, {{description}}, {{technologies}}, {{html}}, {{css}},
{{js}}, {{targetFramework}}, {{targetStyling}} e {{sourceUrl}}; o bloco
condicional {{#js}}...{{/js}} deve desaparecer por completo quando não houver
JavaScript.

A rota aceita somente os frameworks react, vue, svelte, angular ou html, e os
stylings tailwind, css, css-modules ou styled-components, com defaults react e
tailwind. Ela só pode retornar prompts de componentes PUBLISHED e responde
{ "data": { "prompt": "..." } }. Não chame LLM, API externa ou biblioteca de
template desnecessária.

Inclua testes unitários para substituição de variáveis e ausência de JS, além
de testes de integração para defaults, escolhas válidas, query inválida e
componente inexistente.
```

## [done] 8. Implementar auth provisória e administração de componentes

```text
Partindo das regras permanentes, implemente require-admin.ts e todos os
endpoints /api/admin/components.

O middleware provisório deve aceitar exclusivamente Authorization: Bearer
<DEV_ADMIN_TOKEN>. Quando inválido ou ausente, devolva UnauthorizedError; quando
autorizado, preencha req.auth com userId "dev-admin" e email
"admin@dev.local". Estruture o tipo de req.auth para que Clerk possa substituir
somente esse middleware no MVP2. Não implemente Clerk.

Implemente GET lista todos (inclusive DRAFT), GET por :id, POST, PUT e DELETE.
Use os schemas compartilhados, slugify para normalizar slug (minúsculas e sem
acentos) antes da verificação de unicidade e retorne 409 para slug duplicado.
Verifique categoryId no service e retorne 422 se a categoria não existir.
Obtenha/crie o User por upsert preguiçoso a partir de req.auth na escrita;
authorId jamais vem do body. Na publicação inicial, defina publishedAt; ao
voltar PUBLISHED para DRAFT, preserve a primeira data de publicação. DELETE é
hard delete e responde 204.

Crie lib/slug.ts e testes unitários para acentos e caracteres especiais.
Acrescente testes de integração para todos os endpoints administrativos e para
401, slug duplicado, categoria inválida, transições de status e 404. Não crie
soft delete, paginação ou filtros administrativos não descritos no MVP1.
```

## [done] 9. Implementar administração de categorias

```text
Partindo das regras permanentes, implemente POST, PUT e DELETE
/api/admin/categories, todos protegidos pelo middleware provisório.

Valide name (2–50, único), slug opcional derivado quando ausente, description
opcional até 300 e position inteiro com default 0. Normalize o slug antes da
unicidade. Use 409 para name ou slug já existentes, 404 para id inexistente e
respostas 201/200 no envelope { data: ... }.

Na exclusão, consulte se a categoria possui componentes. Se possuir, não a
delete e devolva 409 CATEGORY_IN_USE, incluindo details.componentCount. Caso
contrário, execute hard delete e retorne 204. Não use cascade delete nem mova
componentes automaticamente.

Complete o módulo mantendo separação route/controller/service/repository/mapper
e adicione testes de integração para criar, editar, apagar vazia, bloquear
categoria em uso e negar acesso sem token.
```

## 10. Docker, consolidação e verificação de Definition of Done

```text
Partindo das regras permanentes, conclua o MVP1 sem expandir escopo.

1. Crie docker-compose.yml exatamente para desenvolvimento, com PostgreSQL 16
   alpine, serviço api, volume pgdata, healthcheck, dependência
   service_healthy, porta 5432/4000, migrations + seed no start e volumes de
   desenvolvimento descritos no MVP1. Não adicione serviço web.
2. Crie apps/api/Dockerfile com os estágios base, deps e dev especificados,
   usando Node 22 alpine, Corepack e as dependências de sistema necessárias ao
   Prisma. Não implemente estágio de produção.
3. Configure banco de testes em serviço Postgres separado na porta 5433 e uma
   rotina confiável de migrate antes da suíte + TRUNCATE ... RESTART IDENTITY
   CASCADE entre testes, conforme MVP1.
4. Revise cada um dos 13 endpoints quanto aos envelopes, status HTTP,
   validação, segurança, filtros PUBLISHED, rate limits e logs sem segredos.
5. Execute pnpm lint, pnpm typecheck e a suíte inteira de testes. Se Docker
   estiver disponível, execute docker compose up e valide /api/health; se não,
   explique a limitação sem omitir as demais validações.

Entregue um checklist objetivo comparando o resultado com cada item da
Definition of Done. Não adicione frontend, Clerk, Redis, AWS, CI/CD ou recursos
de etapas posteriores para tentar melhorar o resultado.
```
