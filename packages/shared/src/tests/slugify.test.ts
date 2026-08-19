import { describe, expect, it } from 'vitest';

import { slugify } from '../slugify.js';

describe('slugify', () => {
  it('remove acentos e coloca em minúsculas', () => {
    expect(slugify('Café com Leite')).toBe('cafe-com-leite');
  });

  it('substitui caracteres especiais por hífen e colapsa repetições', () => {
    expect(slugify('Botão "Play"!! 100%')).toBe('botao-play-100');
  });

  it('remove hífens nas extremidades', () => {
    expect(slugify('  --Neon Toggle--  ')).toBe('neon-toggle');
  });

  it('é idempotente para um slug já normalizado', () => {
    expect(slugify('neon-toggle-switch')).toBe('neon-toggle-switch');
  });
});
