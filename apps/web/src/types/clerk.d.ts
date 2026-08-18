export {};

/**
 * `@clerk/backend` define `CustomJwtSessionClaims` como `{[k: string]:
 * unknown}` e documenta explicitamente este merge global como a forma de
 * tipar `auth().sessionClaims` (ver o comentário do próprio pacote em
 * `@clerk/shared/types/jwtv2.d.ts`). `role` fica em `publicMetadata` no
 * Clerk, exposto aqui via *session token customization* (seção 9 do MVP2)
 * — sem essa augmentation, `sessionClaims?.metadata?.role` não compilaria
 * sob TypeScript estrito.
 */
declare global {
  interface CustomJwtSessionClaims {
    metadata?: {
      role?: 'admin';
    };
  }
}
