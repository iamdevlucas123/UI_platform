/**
 * Contexto de autenticação anexado a `req.auth` pelo middleware de admin
 * (seção 9 do MVP1). A versão provisória (`requireAdmin`, fora do escopo
 * desta etapa) preenche isto com `{ userId: 'dev-admin', email: 'admin@dev.local' }`;
 * o Clerk substitui a implementação no MVP2 sem mudar esta interface.
 */
export interface AuthContext {
  userId: string;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      /** Identificador único da requisição, atribuído por middlewares/request-id.ts. */
      id: string;
      /** Presente apenas em rotas autenticadas (`/api/admin/*`); ausente nas públicas. */
      auth?: AuthContext;
    }
  }
}
