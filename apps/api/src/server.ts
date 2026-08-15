import { app } from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { prisma } from './lib/prisma.js';

const server = app.listen(env.PORT, () => {
  logger.info(`API listening on port ${env.PORT}`);
});

server.on('error', (error) => {
  logger.fatal({ err: error }, 'Failed to start server');
  process.exit(1);
});

/**
 * Encerramento gracioso: para de aceitar novas conexões, deixa as
 * requisições em andamento terminarem e só então fecha a conexão com o
 * banco. Evita respostas truncadas em deploy (SIGTERM) e conexões Postgres
 * órfãs quando o processo é interrompido.
 */
function shutdown(signal: NodeJS.Signals): void {
  logger.info(`Received ${signal}, shutting down gracefully...`);

  server.close((closeError) => {
    if (closeError) {
      logger.error({ err: closeError }, 'Error while closing HTTP server');
      process.exitCode = 1;
    }

    prisma.$disconnect()
      .catch((disconnectError: unknown) => {
        logger.error({ err: disconnectError }, 'Error while disconnecting Prisma');
        process.exitCode = 1;
      })
      .finally(() => process.exit());
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
