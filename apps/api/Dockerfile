# Dockerfile de desenvolvimento (MVP1, seção 11). O estágio build/prod fica
# para a etapa Final, quando a API entra em produção — não implementado aqui.
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
# "prisma generate" (sem "run") não resolve o binário de dentro de um
# workspace filtrado — usa o script `prisma:generate` já definido no
# package.json de @uilib/api.
RUN pnpm --filter @uilib/api prisma:generate
EXPOSE 4000
CMD ["pnpm", "--filter", "@uilib/api", "dev"]
