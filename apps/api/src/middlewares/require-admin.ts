import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { env } from '../config/env.js';
import { UnauthorizedError } from '../lib/errors.js';
import type { AuthContext } from '../types/express.js';

/**
 * Extrai o contexto de admin a partir do header `Authorization`, sem lançar
 * erro — devolve `undefined` quando o token está ausente ou não bate com
 * `DEV_ADMIN_TOKEN`. Usado tanto pelo gate obrigatório `requireAdmin`
 * quanto por checagens opcionais em rotas públicas (ex.: `preview=1` no
 * detalhe de componente, seção 7 do MVP1).
 */
export function getAdminAuthContext(req: Request): AuthContext | undefined {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token !== env.DEV_ADMIN_TOKEN) {
    return undefined;
  }
  return { userId: 'dev-admin', email: 'admin@dev.local' };
}

/**
 * `requireAdmin` (versão provisória do MVP1, seção 9): gate obrigatório
 * para `/api/admin/*`. `DEV_ADMIN_TOKEN` é uma variável de dev — qualquer
 * string serve. Substituído inteiramente pela verificação real do Clerk no
 * MVP2; a interface (`req.auth.userId`) permanece a mesma, então nenhum
 * controller ou service precisa mudar.
 */
export const requireAdmin: RequestHandler = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  const auth = getAdminAuthContext(req);
  if (!auth) {
    next(new UnauthorizedError());
    return;
  }
  req.auth = auth;
  next();
};

/**
 * Extrai `req.auth` já preenchido por `requireAdmin` (montado no
 * `adminRouter`, seção 9). Evita `req.auth!` nos controllers admin — lança
 * `UnauthorizedError` defensivamente se, por engano, um handler for
 * registrado fora do `adminRouter`.
 */
export function getRequiredAuth(req: Request): AuthContext {
  if (!req.auth) {
    throw new UnauthorizedError();
  }
  return req.auth;
}
