import { Router, type Router as ExpressRouter } from 'express';

import { prisma } from '../../lib/prisma.js';

const router: ExpressRouter = Router();

/**
 * `GET /api/health` (seção 7 do MVP1): confirma que o banco está acessível
 * executando `SELECT 1`. Resposta sem o envelope `{ data }` — é consumida
 * por healthcheck do Docker e, na etapa Final, pelo pipeline de deploy, não
 * pelo frontend.
 *
 * Não há try/catch aqui de propósito: se o `SELECT 1` falhar, o Express 5
 * encaminha a rejeição automaticamente ao error-handler (500), que é o
 * comportamento certo — mascarar a indisponibilidade do banco devolvendo
 * `db: "ok"` mesmo assim tornaria o healthcheck inútil.
 */
router.get('/health', async (_req, res) => {
  await prisma.$queryRaw`SELECT 1`;

  res.json({
    status: 'ok',
    uptime: process.uptime(),
    db: 'ok',
  });
});

export { router as healthRouter };
