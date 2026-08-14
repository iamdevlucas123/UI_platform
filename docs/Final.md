# Final — Infraestrutura AWS, Deploy, CI/CD e Lançamento

**Etapa 3 de 3 do fluxo de criação** (MVP1 → MVP2 → Final)

---

## 1. Contexto do produto

O projeto é uma **biblioteca web pública de componentes de interface autorais**, no estilo Uiverse.io, com frontend em Next.js, backend em Express/Prisma/PostgreSQL, autenticação de administrador via Clerk, e monorepo pnpm com dois apps (`web`, `api`) e um pacote compartilhado (`shared`). O produto já está funcional em ambiente de desenvolvimento local via Docker Compose: catálogo público navegável, página de detalhes com preview e cópia de prompt de IA, e área administrativa com CRUD de componentes e categorias.

### Escopo desta etapa

Esta etapa **não altera código de aplicação**. O objetivo é levar o que já existe para produção: infraestrutura AWS, imagens Docker de produção, pipeline de CI/CD, testes finais de aceitação e checklist de lançamento.

---

## 2. Arquitetura AWS

### Comparação de opções de compute

| Opção | Custo/mês (est.) | Facilidade de deploy | Manutenção | Crescimento |
|---|---|---|---|---|
| **A. EC2 única + Docker Compose** | ~US$ 12 (t4g.small) | Média (script SSH/SSM) | Você cuida do SO e dos patches | Vertical fácil; horizontal exige refazer |
| **B. ECS Fargate (2 serviços)** | ~US$ 35–50 + ALB US$ 18 | Alta, após setup complexo | Baixa (sem servidor) | Excelente |
| **C. AWS App Runner** | ~US$ 45–70 | Muito alta | Muito baixa | Boa, mas com pouco controle |
| **D. Elastic Beanstalk** | Custo da EC2 + ALB | Alta | Média | Boa, porém a plataforma está estagnada |

**Escolha: A — EC2 única com Docker Compose.**

Justificativa por critério de prioridade:

1. **Baixo custo:** ~1/3 do Fargate, sem os ~US$ 18/mês do ALB, que sozinho custaria mais que o servidor inteiro.
2. **Facilidade de deploy:** com GitHub Actions + SSM Send Command, o deploy é `docker compose pull && up -d` — sem SSH key no CI, sem bastion.
3. **Manutenção:** Amazon Linux 2023 com atualizações automáticas de segurança e Caddy renovando TLS sozinho. Carga de manutenção próxima de zero para um único host.
4. **Crescimento:** o caminho de migração é curto porque tudo já está containerizado — as mesmas imagens rodam no Fargate depois; muda a orquestração, não a aplicação.

### Arquitetura recomendada

```
                    Route 53 (zona hospedada)
                            │
                     A record → EIP
                            │
              ┌─────────────▼──────────────────────────┐
              │ VPC                                    │
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
| **EC2** | t4g.small (2 vCPU ARM, 2 GB RAM), Amazon Linux 2023, EBS gp3 30 GB, Elastic IP | Graviton entrega ~20% mais desempenho por dólar; 2 GB comportam Next + Express com folga |
| **RDS** | PostgreSQL 16, db.t4g.micro, 20 GB gp3, Single-AZ, backup 7 dias, minor upgrades automáticos | Backup automático e PITR são o principal motivo de não rodar Postgres no mesmo container. Multi-AZ dobraria o custo sem necessidade |
| **Route 53** | Zona hospedada + A record para o EIP | ~US$ 0,50/mês |
| **TLS** | Caddy + Let's Encrypt | Gratuito e automático. ACM não é usado por exigir ALB ou CloudFront, custo que não se justifica agora |
| **SSM Parameter Store** | SecureStrings para `DATABASE_URL`, `CLERK_SECRET_KEY`, `REVALIDATE_SECRET` | Grátis no tier standard; mais simples que Secrets Manager |
| **CloudWatch** | Logs dos containers via driver `awslogs`; alarmes de CPU > 80%, RAM, status check | Sem alarme, indisponibilidade só é notada por reclamação |
| **IAM** | Instance profile com permissão mínima: ler SSM, escrever logs, ler GHCR via secret | Sem chaves de acesso estáticas na máquina |
| **S3 / CloudFront** | **Não usados** | Não há upload de arquivos (previews são código renderizado, não imagem); o ISR do Next já entrega HTML cacheado |

### Estimativa de custo mensal (região `us-east-1`)

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

Alavancas de redução: Savings Plan de 1 ano (EC2 + RDS) reduz para ~US$ 26/mês. Rodar Postgres em container na própria EC2 em vez de RDS reduziria para ~US$ 23/mês, mas exige backups manuais e perde PITR — **não recomendado**; os ~US$ 15 do RDS compram tranquilidade de dados. Se a região for `sa-east-1` (São Paulo), somar ~30–40% — para o MVP, `us-east-1` é preferível (mais barato; a latência extra é irrelevante em páginas cacheadas).

---

## 3. Docker de produção

### Dockerfile — API (multi-stage completo)

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

### Dockerfile — Web (multi-stage completo)

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

---

## 4. Provisionamento AWS (passo a passo, manual, uma vez)

Não usar Terraform/CDK neste estágio: são ~7 recursos criados uma única vez. Introduzir IaC se justifica quando houver múltiplos ambientes (staging + prod).

1. Criar VPC (ou usar a default), 1 subnet pública + 2 privadas.
2. Security Groups:
   - `sg-web`: entrada 80/443 de `0.0.0.0/0`; SSH **fechado** (acesso só por SSM Session Manager).
   - `sg-db`: entrada 5432 apenas de `sg-web`.
3. RDS PostgreSQL em subnet group privado, sem acesso público, backup automático de 7 dias.
4. EC2 com instance profile IAM (permissões: SSM, CloudWatch Logs, leitura do GHCR), user-data instalando Docker, Compose plugin e o agente SSM.
5. Parâmetros no SSM Parameter Store (ver Seção 6).
6. Elastic IP associado à EC2; registro A no Route 53 apontando para o EIP.
7. Copiar `docker-compose.prod.yml` e `Caddyfile` para `/opt/uilib` na instância.

---

## 5. CI/CD

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

### Decisões do pipeline

- **GHCR em vez de ECR:** sem custo adicional, sem gerenciar autenticação de registry na AWS.
- **OIDC em vez de chave IAM no GitHub:** elimina credencial de longa duração nos secrets do repositório.
- **SSM Send Command em vez de SSH:** dispensa abrir porta 22 e guardar chave privada no CI.
- **Tag = SHA do commit** em vez de `latest`: cada deploy é rastreável e o rollback é determinístico.
- Um único ambiente (produção) neste estágio. Staging é a próxima adição natural, junto com IaC.

### Fluxo de deploy resumido

```
push na main
  → CI: lint, typecheck, testes
  → build das imagens (linux/arm64) e push para GHCR com tag = SHA do commit
  → aws ssm send-command: pull → migrate deploy → up -d → prune
  → smoke test: GET /api/health
  → se falhar: TAG=<sha anterior> && docker compose up -d   (rollback)
```

**Regra de migrations:** sempre `prisma migrate deploy` (nunca `dev`), sempre **antes** de subir os containers novos. Migrations devem ser retrocompatíveis com a versão anterior da aplicação (ex.: adicionar coluna nullable, popular, só depois tornar obrigatória em deploy separado) — isso torna o rollback seguro, já que migrations não são revertidas automaticamente.

**Downtime:** o `up -d` reinicia containers, causando poucos segundos de indisponibilidade — aceitável neste estágio. Se deixar de ser, o próximo passo é duas réplicas por serviço com Caddy balanceando, sem trocar de infraestrutura.

---

## 6. Variáveis de ambiente de produção

Em produção, todos os segredos vêm do **SSM Parameter Store (SecureString)**, lidos no boot do container — nunca do `.env` versionado.

| Variável | Onde | Valor em produção |
|---|---|---|
| `DATABASE_URL` | api | SSM SecureString, com `?sslmode=require`, apontando para o RDS |
| `NODE_ENV` | api, web | `production` |
| `WEB_ORIGIN` | api | `https://seudominio.com` |
| `LOG_LEVEL` | api | `info` |
| `CLERK_SECRET_KEY` | api, web | SSM SecureString, chave `sk_live_` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | web | Build-time arg, chave `pk_live_` |
| `NEXT_PUBLIC_API_URL` | web (browser) | `https://seudominio.com` |
| `INTERNAL_API_URL` | web (server) | `http://api:4000` |
| `NEXT_PUBLIC_SITE_URL` | web | `https://seudominio.com` |
| `REVALIDATE_SECRET` | api, web | SSM SecureString |
| `SENTRY_DSN` | api, web | Recomendada (ver Seção 7) |

Validação no boot (já implementada nas etapas anteriores): a aplicação falha ao iniciar se faltar variável obrigatória — comportamento mantido em produção, e desejável, pois expõe erro de configuração no deploy em vez de em runtime.

---

## 7. Segurança em produção (checklist completo)

| Vetor | Controle |
|---|---|
| HTTPS | Obrigatório; Caddy emite/renova certificado Let's Encrypt automaticamente; redirect 301 HTTP→HTTPS; HSTS `max-age=31536000` |
| Secrets | 100% fora do repositório e da imagem; SSM Parameter Store SecureString |
| Banco | RDS em subnet privada, sem IP público; security group liberando 5432 apenas para o SG da EC2; `sslmode=require` |
| Rede | SSH fechado na EC2; acesso administrativo só via SSM Session Manager |
| IAM | Instance profile com permissão mínima (SSM, CloudWatch Logs, leitura do GHCR); role de deploy via OIDC, sem chave estática |
| Observabilidade | Sentry (plano free) capturando exceções não tratadas de api e web; alarmes de CloudWatch para CPU > 80%, uso de memória e status check da EC2 |
| Dependências | `pnpm audit` no CI; Dependabot semanal |
| Backup | Backup automático do RDS (7 dias) + PITR habilitado; **testar restore antes do lançamento** (Seção 9) |

**O que deliberadamente fica fora deste estágio:** WAF, Shield Advanced, rotação automática de secrets, Multi-AZ, auto scaling, ALB. Nenhum corresponde ao perfil de risco de um catálogo público de conteúdo autoral com um administrador.

---

## 8. Testes finais e critérios de aceitação

| Camada | Ferramenta | O que valida nesta etapa |
|---|---|---|
| E2E completo | Playwright, contra o ambiente de produção (ou staging equivalente) | Os 5 cenários críticos: home carrega; busca filtra; detalhe renderiza preview e copia código; copiar prompt; login admin → criar → publicar → aparece no site |
| Performance | Lighthouse | Metas: Performance ≥ 90, Acessibilidade ≥ 95, nas páginas `/` e `/component/[slug]` |
| Infraestrutura | Manual | `curl -fsS https://seudominio.com/api/health` retorna 200; certificado TLS válido; HSTS presente nos headers |
| Recuperação de desastre | Manual, uma vez | Restaurar um snapshot do RDS em uma instância separada e confirmar integridade dos dados — **fazer isso antes do lançamento, não depois de precisar** |
| Deploy | Manual, uma vez | Ensaiar um rollback completo (subir tag anterior) para validar que o procedimento funciona sob pressão |

---

## 9. Checklist de lançamento

- [ ] VPC, Security Groups, RDS, EC2, EIP e Route 53 provisionados conforme Seção 4.
- [ ] Parâmetros de produção cadastrados no SSM (Seção 6).
- [ ] `docker-compose.prod.yml` e `Caddyfile` no lugar em `/opt/uilib`.
- [ ] Pipeline `ci.yml` e `deploy.yml` configurados; primeiro deploy executado com sucesso via push na `main`.
- [ ] Domínio resolvendo, HTTPS ativo, HSTS presente.
- [ ] `GET /api/health` respondendo 200 em produção.
- [ ] Sentry recebendo eventos de teste de api e web.
- [ ] Alarmes de CloudWatch configurados e testados (disparar um manualmente para confirmar notificação).
- [ ] Restore de backup do RDS testado com sucesso.
- [ ] Rollback de deploy ensaiado com sucesso.
- [ ] Conteúdo real cadastrado (componentes e categorias) via área administrativa em produção.
- [ ] Suíte Playwright rodando contra produção, todos os 5 cenários passando.
- [ ] Lighthouse ≥ 90 (Performance) e ≥ 95 (Acessibilidade) nas páginas principais.
- [ ] `robots.txt` e `sitemap.xml` acessíveis e corretos.

---

## 10. Evoluções futuras (pós-lançamento)

Ordenadas por relação valor/esforço, considerando a arquitetura implementada.

### Curto prazo

1. **Analytics de uso** (Plausible ou PostHog): quais componentes são mais vistos e, principalmente, **quantos cliques em "Copy AI Prompt"** acontecem — a métrica que valida a tese do produto.
2. **Favoritos locais** via `localStorage`, sem backend.
3. **Página `/prompt-guide`** explicando como usar o prompt em cada agente de IA.
4. **Componentes relacionados** na página de detalhes (mesma categoria).

### Médio prazo

5. **Registry compatível com shadcn** (`/r/[slug].json`), permitindo `npx shadcn add <url>`. É neste ponto que uma entidade de versionamento de componente passa a se justificar.
6. **Servidor MCP** expondo busca e leitura do catálogo como ferramentas para agentes de IA.
7. **Busca semântica com pgvector** (extensão do próprio Postgres, sem novo serviço).
8. **Filtro por tecnologia** (momento de normalizar o campo em tabela própria).
9. **Staging + IaC (Terraform)**, quando um deploy quebrado deixar de ser tolerável.

### Longo prazo

10. **Componentes enviados pela comunidade**, com moderação — muda o perfil de risco: o sandbox do preview deixa de ser defesa em profundidade e passa a ser controle crítico.
11. **Variantes por framework** salvas no banco (React/Vue/Svelte prontos).
12. **CLI própria** (`npx uilib add <slug>`) com detecção automática da stack do projeto.
13. **Migração para ECS Fargate**, quando houver necessidade real de zero-downtime e escala horizontal.

### Gatilhos objetivos para revisitar a arquitetura

| Sinal | Ação |
|---|---|
| Busca `ILIKE` acima de 200 ms | Migrar para `tsvector` com coluna gerada |
| CPU da EC2 sustentada acima de 70% | Subir para t4g.medium (vertical primeiro) |
| Downtime de deploy vira problema | Duas réplicas atrás do Caddy, depois ECS |
| Banda mensal acima de ~200 GB | Colocar CloudFront na frente |
| Segundo autor entra no projeto | Papéis, workflow de revisão e auditoria |
| Consumidores externos (CLI/MCP) em produção | Versionamento de componente + versionamento da API (`/v1`) |
