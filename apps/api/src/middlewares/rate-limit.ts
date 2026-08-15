import rateLimit, { type RateLimitRequestHandler } from 'express-rate-limit';

const ONE_MINUTE_MS = 60_000;

/**
 * Cria um limiter em memória (seção 10 do MVP1: instância única nesta
 * etapa, Redis seria infra desnecessária) que responde com o envelope de
 * erro padronizado em vez do corpo default do `express-rate-limit`.
 */
export function createRateLimiter(limit: number): RateLimitRequestHandler {
  return rateLimit({
    windowMs: ONE_MINUTE_MS,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests. Please try again later.',
        },
      });
    },
  });
}

/** 120 req/min/IP — rotas públicas (seção 10 do MVP1). */
export const publicRateLimit = createRateLimiter(120);

/** 30 req/min/IP — rotas administrativas, `/api/admin/*` (seção 10 do MVP1). */
export const adminRateLimit = createRateLimiter(30);
