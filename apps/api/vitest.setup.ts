/**
 * Preenche variáveis de ambiente mínimas antes de cada arquivo de teste ser
 * carregado, para que módulos que validam `process.env` no import (ex.:
 * `config/env.ts`) não falhem só por rodar fora do `pnpm dev`/Docker. Só
 * testes unitários (sem I/O) dispensam banco real; os de integração
 * (`tests/integration/`) abrem conexão de verdade e precisam do serviço
 * `db_test` (seção 13 do MVP1: `docker-compose.test.yml`, porta 5433,
 * separado do banco de desenvolvimento). `??=` permite sobrescrever via
 * env real (ex.: no CI) sem editar este arquivo.
 */
process.env.NODE_ENV ??= 'test';
process.env.DATABASE_URL ??= 'postgresql://uilib:uilib@localhost:5433/uilib_test?schema=public';
process.env.WEB_ORIGIN ??= 'http://localhost:3000';
process.env.PORT ??= '4000';
process.env.LOG_LEVEL ??= 'error';
process.env.CLERK_SECRET_KEY ??= 'sk_test_ci-secret-key';
