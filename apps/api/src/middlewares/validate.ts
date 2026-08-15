import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ZodType } from 'zod';

import { ValidationError } from '../lib/errors.js';

type ValidationTarget = 'body' | 'query' | 'params';

/**
 * Cria um middleware que valida `req[target]` com um schema Zod de
 * `@uilib/shared` e substitui `req[target]` pelo resultado já parseado
 * (coerções, defaults e transforms do schema já aplicados — ex.: dedupe de
 * `technologies`). Em erro, encaminha uma `ValidationError` com um detalhe
 * por campo inválido, no formato do envelope da seção 7 do MVP1.
 *
 * A substituição usa `Object.defineProperty` em vez de atribuição direta
 * porque, no Express 5, `req.query` é um getter sem setter — `req.query =
 * valor` lançaria `TypeError` em modo estrito (módulos ES já são estritos).
 */
export function validate(target: ValidationTarget, schema: ZodType): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }));
      next(new ValidationError('Invalid payload', details));
      return;
    }

    Object.defineProperty(req, target, {
      value: result.data,
      writable: true,
      enumerable: true,
      configurable: true,
    });

    next();
  };
}
