/**
 * Preenche variáveis de ambiente mínimas antes de cada arquivo de teste ser
 * carregado, para que módulos que validam `process.env` no import (ex.:
 * `config/env.ts`) não falhem só por rodar fora do `pnpm dev`/Docker.
 * Valores fictícios: os testes desta etapa não abrem conexão real com o
 * banco (ver docs/MVP1.md, seção 13 — isso é responsabilidade da suíte de
 * integração, fora do escopo aqui).
 */
process.env.NODE_ENV ??= 'test';
process.env.DATABASE_URL ??= 'postgresql://uilib:uilib@localhost:5432/uilib?schema=public';
process.env.WEB_ORIGIN ??= 'http://localhost:3000';
process.env.PORT ??= '4000';
process.env.LOG_LEVEL ??= 'error';
process.env.DEV_ADMIN_TOKEN ??= 'test-admin-token';
