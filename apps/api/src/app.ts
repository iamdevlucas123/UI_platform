import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';

import { env } from './config/env.js';
import { NotFoundError } from './lib/errors.js';
import { logger } from './lib/logger.js';
import { errorHandler } from './middlewares/error-handler.js';
import { requestId } from './middlewares/request-id.js';
import { apiRouter } from './routes.js';

/**
 * Monta a aplicação Express (sem chamar `listen`): helmet + cors com origem
 * exata + parser JSON limitado a 1MB + correlação de request-id/logs +
 * rotas da API + fallback 404 + handler de erro genérico (seção 10 do
 * MVP1). Ficar separado de `server.ts` permite testar com Supertest sem
 * abrir uma porta real nem depender do Prisma.
 */
export const app: Express = express();

app.use(helmet());
// Origem exata (string fixa), nunca wildcard; sem credenciais (seção 10).
app.use(cors({ origin: env.WEB_ORIGIN, credentials: false }));
app.use(express.json({ limit: '1mb' }));

// request-id precisa rodar antes do pino-http para que os logs de acesso
// sejam correlacionados com o mesmo id devolvido no header ao cliente.
app.use(requestId);
app.use(pinoHttp({ logger }));

app.use('/api', apiRouter);

// Qualquer rota não reconhecida (inclusive as de domínio, ainda não
// implementadas nesta etapa) cai aqui em vez do HTML padrão do Express,
// mantendo o envelope de erro consistente em toda a API.
app.use((req, _res, next) => {
  next(new NotFoundError(`Route ${req.method} ${req.originalUrl} not found`));
});

app.use(errorHandler);
