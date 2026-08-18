import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Necessário para os testes de componente (`*.test.tsx`, ambiente jsdom
  // por arquivo via `// @vitest-environment jsdom`) — sem o plugin, o
  // transform padrão do Vitest não reconhece JSX em arquivos `.tsx`.
  plugins: [react()],
  resolve: {
    // Mesmo alias de `tsconfig.json` (`@/*` → `src/*`) — o Next.js resolve
    // isso via `paths` do tsconfig, mas o Vite/Vitest precisa da própria
    // configuração de `resolve.alias` para os imports funcionarem em teste.
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
  },
});
