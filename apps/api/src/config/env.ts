import { z } from 'zod';

/**
 * Schema das variáveis de ambiente da aplicação. `DEV_ADMIN_TOKEN` (auth
 * provisória do MVP1, seção 9) foi removida nesta etapa: `CLERK_SECRET_KEY`
 * é quem autentica `/api/admin/*` agora, via `verifyToken` (`@clerk/backend`)
 * em `middlewares/require-admin.ts`. `WEB_ORIGIN` já existia (CORS) e passa
 * a ser reaproveitada como `authorizedParties` na verificação do token —
 * mesmo critério do `NEXT_PUBLIC_SITE_URL` no frontend.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  DATABASE_URL: z.url(),
  WEB_ORIGIN: z.url(),
  PORT: z.coerce.number().default(4000),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  CLERK_SECRET_KEY: z.string().min(1).startsWith('sk_'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // A aplicação nunca deve subir com configuração incompleta (seção 10):
  // falha aqui, no boot, em vez de quebrar mais tarde numa request qualquer.
  console.error('Invalid environment variables:', parsed.error.issues);
  throw new Error('Invalid environment variables');
}

/** Variáveis de ambiente validadas — única fonte de configuração da aplicação. */
export const env = parsed.data;
