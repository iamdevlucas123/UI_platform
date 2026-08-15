import { randomUUID } from 'node:crypto';

import type { NextFunction, Request, Response } from 'express';

const REQUEST_ID_HEADER = 'X-Request-Id';

/**
 * Atribui um identificador único a cada requisição (`req.id`) e o devolve
 * no header `X-Request-Id`, para correlacionar logs e facilitar suporte.
 * Precisa rodar antes do `pino-http` em `app.ts`: o pino-http reaproveita
 * `req.id` automaticamente se ele já estiver definido, em vez de gerar o
 * seu próprio (número sequencial, sem valor para correlação externa).
 */
export function requestId(req: Request, res: Response, next: NextFunction): void {
  req.id = randomUUID();
  res.setHeader(REQUEST_ID_HEADER, req.id);
  next();
}
