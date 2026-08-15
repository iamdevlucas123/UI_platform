import { z } from 'zod';

/**
 * Schema das seis variáveis de ambiente desta etapa (MVP1, seção 12).
 * `DEV_ADMIN_TOKEN` é a auth provisória (seção 9) — qualquer string não
 * vazia serve em dev; é substituída pelo Clerk no MVP2.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  DATABASE_URL: z.url(),
  WEB_ORIGIN: z.url(),
  PORT: z.coerce.number().default(4000),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  DEV_ADMIN_TOKEN: z.string().min(1),
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
