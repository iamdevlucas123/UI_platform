import type { ApiErrorResponse } from '@uilib/shared';
import type { NextFunction, Request, Response } from 'express';

import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

/**
 * Formato usado por erros HTTP de módulos do próprio ecossistema Express
 * (ex.: `body-parser`, ao rejeitar um body acima do limite de
 * `express.json({ limit: '1mb' })`). `expose: true` é a convenção do pacote
 * `http-errors` para marcar que a mensagem é segura para o cliente — não é
 * um bug interno, então não deve virar 500.
 */
interface ExposedHttpError extends Error {
  statusCode: number;
  expose: true;
}

function isExposedHttpError(error: unknown): error is ExposedHttpError {
  return (
    error instanceof Error &&
    'statusCode' in error &&
    typeof (error as { statusCode: unknown }).statusCode === 'number' &&
    (error as { expose?: unknown }).expose === true
  );
}

/**
 * Middleware de erro do Express — precisa dos 4 parâmetros para ser
 * reconhecido como error handler, mesmo sem usar `next` (assinatura exigida
 * pelo Express, não uma escolha nossa).
 *
 * Único ponto que decide o que o cliente vê: `AppError` retorna seu próprio
 * código/mensagem/detalhes; erros HTTP conhecidos do Express (acima)
 * preservam o status original; qualquer outro erro vira 500 genérico. O
 * stack trace só vai para o log — nunca para a resposta (seção 10 do MVP1).
 */
export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (error instanceof AppError) {
    // Erros de domínio esperados (400/401/403/404/409...) não são logados
    // como error — o access log do pino-http já registra o status; só
    // falhas de servidor (5xx) precisam do stack trace no log.
    if (error.statusCode >= 500) {
      logger.error({ err: error, reqId: req.id }, error.message);
    }

    const body: ApiErrorResponse = {
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    };

    res.status(error.statusCode).json(body);
    return;
  }

  if (isExposedHttpError(error)) {
    const body: ApiErrorResponse = {
      error: { code: 'BAD_REQUEST', message: error.message },
    };

    res.status(error.statusCode).json(body);
    return;
  }

  logger.error({ err: error, reqId: req.id }, 'Unhandled error');

  const body: ApiErrorResponse = {
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong. Please try again later.',
    },
  };

  res.status(500).json(body);
}
