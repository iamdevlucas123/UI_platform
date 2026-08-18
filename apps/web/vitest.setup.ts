/**
 * Preenche variáveis de ambiente mínimas antes de cada arquivo de teste ser
 * carregado, para que `src/lib/env.ts` (que valida `process.env` como
 * efeito colateral do import) não falhe só por rodar fora do `pnpm dev`/
 * Docker — mesmo critério de `apps/api/vitest.setup.ts`. `??=` permite
 * sobrescrever via env real (ex.: no CI) sem editar este arquivo.
 */
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ??= 'pk_test_test-key';
process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL ??= '/sign-in';
process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL ??= '/admin';
process.env.NEXT_PUBLIC_API_URL ??= 'http://localhost:4000';
process.env.NEXT_PUBLIC_SITE_URL ??= 'http://localhost:3000';
process.env.CLERK_SECRET_KEY ??= 'sk_test_test-key';
process.env.INTERNAL_API_URL ??= 'http://api:4000';
process.env.REVALIDATE_SECRET ??= 'test-revalidate-secret';
