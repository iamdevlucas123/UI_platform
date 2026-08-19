export {};

/**
 * `@clerk/backend` define `CustomJwtSessionClaims` como `{[k: string]:
 * unknown}` e documenta este merge global como a forma de tipar o retorno
 * de `verifyToken` (seção 9 do MVP2). Espelha exatamente a mesma augmentation
 * de `apps/web/src/types/clerk.d.ts` — `role` fica em `publicMetadata` no
 * Clerk, exposto no token via *session token customization* no dashboard.
 * `email` também precisa ser adicionado lá como claim customizada (ex.:
 * `{{user.primary_email_address}}`); sem isso, `claims.email` vem
 * `undefined` e `requireAdmin` cai para string vazia (ver comentário em
 * `middlewares/require-admin.ts`).
 */
declare global {
  interface CustomJwtSessionClaims {
    metadata?: {
      role?: 'admin';
    };
    email?: string;
  }
}
