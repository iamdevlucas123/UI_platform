import { verifyToken } from '@clerk/backend';
import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { env } from '../config/env.js';
import { ForbiddenError, UnauthorizedError } from '../lib/errors.js';
import type { AuthContext } from '../types/express.js';

interface AdminTokenResult {
  auth: AuthContext;
  isAdmin: boolean;
}

/**
 * Verifica o Bearer token via `@clerk/backend` (seção 9 do MVP2). O
 * `verifyToken` importado da raiz do pacote lança em token ausente/inválido/
 * expirado (é o wrapper `withLegacyReturn` em torno da API interna
 * `{data,errors}`) — por isso `try/catch`, como no código ilustrativo da
 * seção 9. A verificação é *networkless* na prática: o JWKS é buscado uma
 * vez via `secretKey` e cacheado pelo SDK, sem chamada de rede por request
 * subsequente.
 *
 * `claims.email` só existe se a claim customizada `email` for adicionada no
 * dashboard do Clerk (não é enviada por padrão) — na ausência, cai para
 * string vazia em vez de quebrar o preenchimento de `req.auth`.
 */
async function verifyAdminBearerToken(token: string): Promise<AdminTokenResult | undefined> {
  try {
    const claims = await verifyToken(token, {
      secretKey: env.CLERK_SECRET_KEY,
      authorizedParties: [env.WEB_ORIGIN],
    });

    return {
      auth: { userId: claims.sub, email: claims.email ?? '' },
      isAdmin: claims.metadata?.role === 'admin',
    };
  } catch {
    return undefined;
  }
}

/**
 * Extrai o contexto de admin a partir do header `Authorization`, sem lançar
 * erro — devolve `undefined` quando o token está ausente, inválido/expirado
 * ou válido mas sem `role: 'admin'`. Usado tanto pelo gate obrigatório
 * `requireAdmin` quanto por checagens opcionais em rotas públicas (ex.:
 * `preview=1` no detalhe de componente, seção 5.2 do MVP2): pedir preview
 * sem um token de admin válido tem exatamente o mesmo efeito de não pedir.
 */
export async function getAdminAuthContext(req: Request): Promise<AuthContext | undefined> {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return undefined;
  }

  const result = await verifyAdminBearerToken(token);
  return result?.isAdmin ? result.auth : undefined;
}

/**
 * `requireAdmin` (seção 9 do MVP2): gate obrigatório para `/api/admin/*`.
 * Distingue autenticação de autorização — sem token ou token inválido/
 * expirado vira 401; token válido mas sem `role: 'admin'` vira 403. Mantém
 * a mesma interface da versão provisória do MVP1 (`req.auth.userId`,
 * `req.auth.email`), então nenhum controller ou service precisou mudar.
 */
export const requireAdmin: RequestHandler = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    next(new UnauthorizedError());
    return;
  }

  const result = await verifyAdminBearerToken(token);
  if (!result) {
    next(new UnauthorizedError());
    return;
  }
  if (!result.isAdmin) {
    next(new ForbiddenError());
    return;
  }

  req.auth = result.auth;
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
