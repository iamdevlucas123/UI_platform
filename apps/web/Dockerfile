# Dockerfile de desenvolvimento (MVP2, seção 12). O estágio build/prod (usa
# `output: 'standalone'`, já configurado em `next.config.ts`) fica para a
# etapa Final, quando o web entra em produção — não implementado aqui, mesmo
# critério do Dockerfile de `apps/api`.
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
