import { z } from 'zod';

/**
 * Variáveis `NEXT_PUBLIC_*` (MVP2, seção 13): seguras em Client e Server
 * Components, embutidas no bundle do navegador em build time. Cada chave é
 * lida individualmente a partir de `process.env` (nunca via spread) porque
 * o compilador do Next.js só consegue inlinar acessos estáticos como
 * `process.env.NEXT_PUBLIC_X`.
 */
const publicSchema = z.object({
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1).startsWith('pk_'),
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: z.string().min(1).startsWith('/'),
  NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: z.string().min(1).startsWith('/'),
  NEXT_PUBLIC_API_URL: z.url(),
  NEXT_PUBLIC_SITE_URL: z.url(),
});

/**
 * Variáveis apenas de servidor (MVP2, seção 13): `CLERK_SECRET_KEY` e
 * `REVALIDATE_SECRET` nunca podem chegar ao bundle do cliente.
 */
const serverSchema = z.object({
  CLERK_SECRET_KEY: z.string().min(1).startsWith('sk_'),
  INTERNAL_API_URL: z.url(),
  REVALIDATE_SECRET: z.string().min(1),
});

function parse<Schema extends z.ZodTypeAny>(
  schema: Schema,
  values: Record<string, string | undefined>,
  label: string,
): z.output<Schema> {
  const parsed = schema.safeParse(values);
  if (!parsed.success) {
    // A aplicação nunca deve subir com configuração incompleta — falha aqui,
    // no boot, em vez de quebrar mais tarde numa request qualquer (mesmo
    // critério usado em apps/api/src/config/env.ts).
    console.error(`Invalid ${label} environment variables:`, parsed.error.issues);
    throw new Error(`Invalid ${label} environment variables`);
  }
  return parsed.data;
}

/** Config pública — pode ser importada de qualquer Client ou Server Component. */
export const publicEnv = parse(
  publicSchema,
  {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    NEXT_PUBLIC_CLERK_SIGN_IN_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL,
    NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  },
  'public',
);

type ServerEnv = z.infer<typeof publicSchema> & z.infer<typeof serverSchema>;

/**
 * Config completa, incluindo segredos de servidor. Importar **apenas** em
 * Server Components, Route Handlers ou `middleware.ts`. A validação do
 * schema de servidor só roda em `typeof window === 'undefined'`: em um
 * bundle de cliente, `process.env.CLERK_SECRET_KEY` não é inlinado pelo
 * Next.js (fica `undefined`), então em vez de expor um objeto com segredo
 * ausente, qualquer acesso acidental a `env` a partir do navegador lança
 * imediatamente.
 */
export const env: ServerEnv =
  typeof window === 'undefined'
    ? {
        ...publicEnv,
        ...parse(
          serverSchema,
          {
            CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
            INTERNAL_API_URL: process.env.INTERNAL_API_URL,
            REVALIDATE_SECRET: process.env.REVALIDATE_SECRET,
          },
          'server',
        ),
      }
    : new Proxy({} as ServerEnv, {
        get(_target, property) {
          throw new Error(
            `env.${String(property)} foi acessado no cliente — use "publicEnv" em vez de "env" fora de código server-only.`,
          );
        },
      });
