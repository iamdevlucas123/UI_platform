import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    setupFiles: ['./vitest.setup.ts'],
    // Os testes de integração (tests/integration/) compartilham um único
    // Postgres real e fazem TRUNCATE entre casos (seção 13 do MVP1). Rodar
    // arquivos de teste em paralelo faria o TRUNCATE de um arquivo colidir
    // com inserts/asserts de outro contra as mesmas tabelas.
    fileParallelism: false,
  },
});
