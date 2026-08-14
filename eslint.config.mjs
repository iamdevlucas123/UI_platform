// Configuração de lint compartilhada por todo o monorepo (flat config do ESLint 9).
// Cada workspace roda `eslint .` a partir da sua própria pasta, mas herda estas regras
// porque o ESLint procura o config file subindo diretórios até a raiz.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/coverage/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // Evita variáveis não usadas, mas permite prefixar com `_` quando intencional
      // (ex.: parâmetros de middleware Express como `next` em handlers de erro).
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
);
