import { PrismaClient } from '@prisma/client';

declare global {
  var prismaGlobal: PrismaClient | undefined;
}

/**
 * Instância única do Prisma Client para toda a aplicação. Repositories devem
 * importar `prisma` deste módulo em vez de instanciar `PrismaClient`
 * diretamente.
 *
 * Fora de produção, a instância é guardada em `globalThis`: ferramentas de
 * watch/reload (`tsx watch`, test runners) podem reavaliar este módulo mais
 * de uma vez no mesmo processo, e cada `new PrismaClient()` abre seu próprio
 * pool de conexões — sem o cache, o Postgres de desenvolvimento esgotaria as
 * conexões disponíveis rapidamente.
 */
export const prisma = globalThis.prismaGlobal ?? new PrismaClient({
  log: ['warn', 'error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = prisma;
}
